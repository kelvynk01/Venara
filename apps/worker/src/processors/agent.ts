/**
 * processors/agent.ts — BullMQ processor for the `agent` queue (Brief §9/§13).
 *
 * Payload: { jobRecordId, agentRequestId, workspaceId, phase: 'plan' | 'execute' }
 *
 * Two-phase design:
 *
 * plan phase:
 *   1. Set AgentRequest status → planning; build initial progress list.
 *   2. Run planPhase (PARSE → RESOLVE → PLAN → CONFIRM detection).
 *   3. Persist parsedIntentJson + planJson + progressJson.
 *   4a. If needsConfirmation → set status=needs_input + question field. STOP.
 *   4b. Else fall through to execute phase inline.
 *
 * execute phase (also entered after confirm via a separate job enqueue):
 *   1. Set status → capturing; update progress.
 *   2. Resolve credentials (if loginMode=credentials).
 *   3. Run executePhase (CAPTURE → SCRIPT).
 *   4. Upload DOM/visual snapshot (+ optional HLS→MP4) to R2; persist Capture row.
 *   5. Create Flow, Video (howto), Render rows; set Video.currentRenderId.
 *   6. Enqueue render job → existing render pipeline produces the MP4.
 *   7. Set AgentRequest status → done + resultVideoId.
 *   8. On any failure: status=failed + lastError; Job mirror failed; rethrow.
 *
 * Logging: prompt, intent summary, plan step count, outcome — fully logged to the
 * AgentRequest fields for post-mortem (Brief §9). Credential VALUES are never logged.
 *
 * Follows the canonical noop.ts try/finally + Job-mirror shape (Brief §13).
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Job } from 'bullmq';
import {
  planPhase,
  executePhase,
  buildProgressSteps,
  AGENT_PHASE_LABELS,
} from '@venara/agent';
import type { AgentPlanOutput } from '@venara/llm';
import type { AgentIntentOutput } from '@venara/llm';
import {
  getAgentRequest,
  updateAgentRequest,
  getConnectedApp,
  resolveSecret,
  parseSessionState,
  setAppSession,
  createFlow,
  createCapture,
  updateCapture,
  createVideo,
  createRender,
  setVideoCurrentRender,
  updateJobStatus,
  type WorkspaceScope,
} from '@venara/db';
import { getStorage, storageKeys } from '@venara/storage';
import { QUEUE_NAMES } from '@venara/shared';
import type { AgentProgressStep } from '@venara/shared';

const execFileAsync = promisify(execFile);

// ─── Job payload ──────────────────────────────────────────────────────────────

export interface AgentJobData {
  jobRecordId: string;
  agentRequestId: string;
  workspaceId: string;
  phase: 'plan' | 'execute';
}

// ─── Progress indices (aligned with AGENT_PHASE_LABELS) ───────────────────────
// 0 = Parsing intent, 1 = Planning steps, 2 = Capturing app,
// 3 = Writing narration, 4 = Rendering video

const PROGRESS_PARSING = 0;
const PROGRESS_PLANNING = 1;
const PROGRESS_CAPTURING = 2;
const PROGRESS_NARRATING = 3;
const PROGRESS_RENDERING = 4;

// ─── Processor ───────────────────────────────────────────────────────────────

export async function processAgent(job: Job<AgentJobData>): Promise<{ ok: true }> {
  const { jobRecordId, agentRequestId, workspaceId, phase } = job.data;

  // Transition Job mirror → active.
  if (jobRecordId) {
    await updateJobStatus({ id: jobRecordId, status: 'active', attempts: job.attemptsMade });
  }

  const scope: WorkspaceScope = { workspaceId };

  // Temp dirs for capture + render artifacts — cleaned up in finally.
  let captureTmpDir: string | undefined;

  try {
    // Fetch the AgentRequest (workspace-scoped).
    const agentRequest = await getAgentRequest(scope, agentRequestId);
    if (!agentRequest) {
      throw new Error(
        `AgentRequest ${agentRequestId} not found in workspace ${workspaceId}`,
      );
    }

    if (phase === 'plan') {
      await runPlanPhase(scope, agentRequest, jobRecordId, job.attemptsMade);
    } else {
      captureTmpDir = await runExecutePhase(scope, agentRequest, jobRecordId, job.attemptsMade);
    }

    // Transition Job mirror → completed.
    if (jobRecordId) {
      await updateJobStatus({
        id: jobRecordId,
        status: 'completed',
        attempts: job.attemptsMade,
      });
    }

    return { ok: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Mark the AgentRequest as failed with the error message.
    await updateAgentRequest(scope, agentRequestId, {
      status: 'failed',
      lastError: errorMessage,
    }).catch(() => undefined);

    // Transition Job mirror → failed.
    if (jobRecordId) {
      await updateJobStatus({
        id: jobRecordId,
        status: 'failed',
        attempts: job.attemptsMade,
        lastError: errorMessage,
      }).catch(() => undefined);
    }

    // Rethrow so BullMQ records the failure and schedules any retry.
    throw err;
  } finally {
    // Clean up temp dirs to avoid disk exhaustion.
    if (captureTmpDir) {
      await rm(captureTmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

// ─── Plan phase ───────────────────────────────────────────────────────────────

async function runPlanPhase(
  scope: WorkspaceScope,
  agentRequest: Awaited<ReturnType<typeof getAgentRequest>> & object,
  _jobRecordId: string,
  _attempts: number,
): Promise<void> {
  const { id: agentRequestId, prompt, connectedAppId } = agentRequest;

  // Fetch the connected app to get its baseUrl.
  const app = await getConnectedApp(scope, connectedAppId);
  if (!app) {
    throw new Error(`Connected app ${connectedAppId} not found in workspace.`);
  }

  // Mark status=planning + initial progress.
  const initialProgress: AgentProgressStep[] = buildProgressSteps(
    [...AGENT_PHASE_LABELS],
    PROGRESS_PARSING,
  );
  await updateAgentRequest(scope, agentRequestId, {
    status: 'planning',
    progressJson: initialProgress as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // PARSE → RESOLVE → PLAN → CONFIRM detection.
  console.log(
    `[agent:plan] agentRequestId=${agentRequestId} prompt="${prompt.slice(0, 120)}" baseUrl=${app.baseUrl}`,
  );

  const planningProgress: AgentProgressStep[] = buildProgressSteps(
    [...AGENT_PHASE_LABELS],
    PROGRESS_PLANNING,
  );
  await updateAgentRequest(scope, agentRequestId, {
    progressJson: planningProgress as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  const { intent, plan, needsConfirmation, confirmationQuestion } = await planPhase({
    prompt,
    baseUrl: app.baseUrl,
  });

  // Persist the parsed intent + plan for debugging (Brief §9 — fully logged).
  console.log(
    `[agent:plan] agentRequestId=${agentRequestId} intentGoal="${intent.goal}" steps=${plan.steps.length} needsConfirmation=${needsConfirmation}`,
  );

  if (needsConfirmation) {
    // CONFIRM gate: stop and wait for user confirmation (Brief §9).
    await updateAgentRequest(scope, agentRequestId, {
      status: 'needs_input',
      parsedIntentJson: intent as unknown as import('@prisma/client').Prisma.InputJsonValue,
      planJson: plan as unknown as import('@prisma/client').Prisma.InputJsonValue,
      progressJson: buildProgressSteps(
        [...AGENT_PHASE_LABELS],
        PROGRESS_CAPTURING,
      ) as unknown as import('@prisma/client').Prisma.InputJsonValue,
      question: confirmationQuestion ?? null,
    });

    console.log(
      `[agent:plan] agentRequestId=${agentRequestId} → needs_input: "${confirmationQuestion ?? ''}"`,
    );
    return;
  }

  // No confirmation needed — persist and fall through to execute inline.
  // The execute phase is called by the same job (not a separate enqueue) to avoid
  // an extra queue round-trip for the common case. Set status=capturing so the
  // execute-phase status guard (which rejects replayed/forged execute jobs) passes.
  await updateAgentRequest(scope, agentRequestId, {
    status: 'capturing',
    parsedIntentJson: intent as unknown as import('@prisma/client').Prisma.InputJsonValue,
    planJson: plan as unknown as import('@prisma/client').Prisma.InputJsonValue,
    progressJson: buildProgressSteps(
      [...AGENT_PHASE_LABELS],
      PROGRESS_CAPTURING,
    ) as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // Inline execute (no confirmation required).
  await runExecutePhase(scope, agentRequest, _jobRecordId, _attempts);
}

// ─── Execute phase ────────────────────────────────────────────────────────────

/**
 * CAPTURE → SCRIPT → persist artifacts → create Video + Render rows → enqueue render.
 * Returns the temp dir path for cleanup in the outer finally.
 */
async function runExecutePhase(
  scope: WorkspaceScope,
  agentRequest: Awaited<ReturnType<typeof getAgentRequest>> & object,
  _jobRecordId: string,
  _attempts: number,
): Promise<string | undefined> {
  const { id: agentRequestId, connectedAppId } = agentRequest;

  // Fetch the connected app.
  const app = await getConnectedApp(scope, connectedAppId);
  if (!app) {
    throw new Error(`Connected app ${connectedAppId} not found in workspace.`);
  }

  // Reload agentRequest to get the latest plan (may have been written by plan phase inline).
  const freshRequest = await getAgentRequest(scope, agentRequestId);
  if (!freshRequest) {
    throw new Error(`AgentRequest ${agentRequestId} disappeared during execute phase.`);
  }

  // Parse the plan from the JSON field (was persisted by plan phase).
  const plan = freshRequest.planJson as unknown as AgentPlanOutput | null;
  const intent = freshRequest.parsedIntentJson as unknown as AgentIntentOutput | null;

  if (!plan || !intent) {
    throw new Error(
      `AgentRequest ${agentRequestId} is missing plan or intent — cannot execute without a plan.`,
    );
  }

  // CONFIRM-gate enforcement (Brief §9): execute may ONLY run for a request that the
  // API moved to `capturing` (either via the confirm endpoint or the non-risky inline
  // fall-through). This makes the gate stateful — a replayed/forged BullMQ job with
  // phase='execute' for a request still in `planning`/`needs_input`/`done` is rejected
  // before any (possibly irreversible) capture step runs.
  if (freshRequest.status !== 'capturing') {
    throw new Error(
      `AgentRequest ${agentRequestId} is not in 'capturing' status (got '${freshRequest.status}') — ` +
        'refusing to execute. Possible replayed job or unconfirmed run.',
    );
  }

  // Update progress → capturing.
  await updateAgentRequest(scope, agentRequestId, {
    status: 'capturing',
    progressJson: buildProgressSteps(
      [...AGENT_PHASE_LABELS],
      PROGRESS_CAPTURING,
    ) as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // ── Resolve the captured auth session (loginMode=session, ADR-001) ─────────
  let sessionState: import('@venara/capture').CaptureSessionState | undefined;
  if (app.loginMode === 'session') {
    if (app.sessionStatus !== 'active' || !app.credentialsRef) {
      await setAppSession(scope, app.id, { sessionStatus: 'expired' }).catch(() => undefined);
      throw new Error('NEEDS_REAUTH: reconnect this app to refresh its login, then try again.');
    }
    const plaintext = await resolveSecret(scope, app.credentialsRef);
    if (!plaintext) {
      await setAppSession(scope, app.id, { sessionStatus: 'expired' }).catch(() => undefined);
      throw new Error('NEEDS_REAUTH: reconnect this app to refresh its login, then try again.');
    }
    try {
      // NOTE: session values are NEVER logged (Brief §17).
      sessionState = parseSessionState(plaintext) as unknown as import('@venara/capture').CaptureSessionState;
    } catch {
      await setAppSession(scope, app.id, { sessionStatus: 'expired' }).catch(() => undefined);
      throw new Error('NEEDS_REAUTH: reconnect this app to refresh its login, then try again.');
    }
  }

  // ── Extract pronunciation lexicon ─────────────────────────────────────────
  const lexicon = extractLexicon(app.pronunciation);

  // ── CAPTURE + SCRIPT ──────────────────────────────────────────────────────
  console.log(
    `[agent:execute] agentRequestId=${agentRequestId} steps=${plan.steps.length} baseUrl=${app.baseUrl}`,
  );

  const { captureResult, narration } = await executePhase({
    plan,
    intent,
    baseUrl: app.baseUrl,
    sessionState,
    lexicon,
  });

  // Session expired mid-run → mark for reconnect and fail with a clear message.
  if (captureResult.outcome === 'needs_reauth') {
    await setAppSession(scope, app.id, { sessionStatus: 'expired' }).catch(() => undefined);
    throw new Error('NEEDS_REAUTH: reconnect this app to refresh its login, then try again.');
  }

  console.log(
    `[agent:execute] agentRequestId=${agentRequestId} captureOk=true beats=${captureResult.beats.length} durationMs=${captureResult.durationMs}`,
  );

  // Update progress → writing narration.
  await updateAgentRequest(scope, agentRequestId, {
    progressJson: buildProgressSteps(
      [...AGENT_PHASE_LABELS],
      PROGRESS_NARRATING,
    ) as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // ── Upload capture artifacts to R2 ────────────────────────────────────────
  // We need a captureId for the storage key — create a Flow + Capture row first.

  // Create a Flow row for this agent-driven capture.
  const flow = await createFlow(scope, {
    connectedAppId: connectedAppId,
    title: intent.goal.slice(0, 200),
    intent: intent.goal,
    stepsJson: plan.steps as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // Create a Capture row.
  const captureRow = await createCapture(scope, { flowId: flow.id });

  // Update capture → capturing.
  await updateCapture(scope, captureRow.id, { status: 'capturing' });

  // Upload artifacts.
  const storage = getStorage();
  const keys = storageKeys.capture(scope.workspaceId, captureRow.id);

  await storage.put(keys.dom, captureResult.domSnapshot, 'application/json');
  await storage.put(keys.visual, captureResult.visualSnapshot, 'image/png');

  let rawVideoKey: string | undefined;
  let captureTmpDir: string | undefined;

  // Transcode HLS → MP4 if available (best-effort).
  if (captureResult.recordingPlaylistUrl) {
    const result = await transcodeHlsToMp4(
      captureResult.recordingPlaylistUrl,
      keys.raw,
      storage,
    );
    rawVideoKey = result?.key;
    captureTmpDir = result?.tmpDir;
  }

  // Persist the completed capture row.
  await updateCapture(scope, captureRow.id, {
    status: 'done',
    browserbaseSessionId: captureResult.browserbaseSessionId,
    rawVideoKey: rawVideoKey,
    domSnapshotKey: keys.dom,
    visualSnapshotKey: keys.visual,
    durationMs: captureResult.durationMs,
  });

  // ── Create Video + Render rows ─────────────────────────────────────────────
  const videoTitle = `${intent.targetFeature} — How-to`;

  const video = await createVideo(scope, {
    connectedAppId,
    flowId: flow.id,
    captureId: captureRow.id,
    type: 'howto',
    title: videoTitle,
  });

  const render = await createRender(scope, {
    videoId: video.id,
    aspect: '16:9',
    // Persist the narration script so the render worker can use it.
    scriptJson: narration as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // Point the video to this render.
  await setVideoCurrentRender(scope, video.id, render.id);

  // ── Enqueue render job ─────────────────────────────────────────────────────
  // Import the enqueue helper lazily to avoid a circular dependency between packages.
  // The render queue enqueue is done via the shared QUEUE_NAMES constant.
  // We directly use BullMQ + db helpers rather than importing from apps/api (Brief §6).
  await enqueueRenderJob(scope.workspaceId, video.id, render.id);

  // ── Finalise AgentRequest ──────────────────────────────────────────────────
  // The MP4 may still be rendering; set status=done now that Video+Render are committed
  // and the render job is enqueued. The UI polls the video's own render status separately.
  // (See Brief §9 comment: "set done once video+render+enqueue are committed".)
  await updateAgentRequest(scope, agentRequestId, {
    status: 'done',
    resultVideoId: video.id,
    progressJson: buildProgressSteps(
      [...AGENT_PHASE_LABELS],
      PROGRESS_RENDERING,
    ) as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  console.log(
    `[agent:execute] agentRequestId=${agentRequestId} → done. videoId=${video.id} renderId=${render.id}`,
  );

  return captureTmpDir;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enqueue a render job for the agent-created video.
 * Uses the BullMQ Queue directly (the API's `enqueue` helper lives in apps/api and
 * the worker cannot import from apps; replicate the two-step pattern here with
 * a lightweight local queue reference).
 *
 * TODO(verify with live key): confirm the Queue connection settings match the
 * worker's existing Redis connection.
 */
async function enqueueRenderJob(
  workspaceId: string,
  videoId: string,
  renderId: string,
): Promise<void> {
  // Import db helpers and BullMQ lazily to keep this module importable without live deps.
  const { Queue } = await import('bullmq');
  const { redisConnection } = await import('../connection.js');
  const { recordJob } = await import('@venara/db');

  const renderQueue = new Queue(QUEUE_NAMES.render, { connection: redisConnection });

  try {
    const record = await recordJob({
      type: 'render',
      payload: { videoId, renderId, workspaceId },
    });
    await renderQueue.add('render', {
      jobRecordId: record.id,
      videoId,
      renderId,
      workspaceId,
    });
    console.log(
      `[agent:execute] enqueued render job jobRecordId=${record.id} renderId=${renderId}`,
    );
  } finally {
    // Close the locally-created queue connection to avoid leaking handles.
    await renderQueue.close().catch(() => undefined);
  }
}

/**
 * Extract the pronunciation lexicon from a ConnectedApp's pronunciation JSON field.
 */
function extractLexicon(
  pronunciation: import('@prisma/client').Prisma.JsonValue | null,
): { term: string; say: string }[] {
  if (!pronunciation || typeof pronunciation !== 'object' || Array.isArray(pronunciation)) {
    return [];
  }
  const raw = pronunciation as Record<string, unknown>;
  const lexicon = raw['lexicon'];
  if (!Array.isArray(lexicon)) return [];

  return lexicon.flatMap((entry) => {
    if (
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      'term' in entry &&
      'say' in entry
    ) {
      const e = entry as Record<string, unknown>;
      return [{ term: String(e['term']), say: String(e['say']) }];
    }
    return [];
  });
}

interface TranscodeResult {
  key: string;
  tmpDir: string;
}

/**
 * Transcode an HLS playlist URL to MP4 via ffmpeg (`-c copy` — no re-encode).
 * Writes output to a temp file, uploads to R2, returns the key + tmpDir.
 * Best-effort: returns undefined on any failure without throwing.
 */
async function transcodeHlsToMp4(
  playlistUrl: string,
  targetKey: string,
  storage: import('@venara/storage').StorageProvider,
): Promise<TranscodeResult | undefined> {
  let tmpDir: string | undefined;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'venara-agent-'));
    const outPath = join(tmpDir, 'raw.mp4');

    await execFileAsync(
      'ffmpeg',
      ['-i', playlistUrl, '-c', 'copy', '-y', outPath],
      { timeout: 5 * 60 * 1000 },
    );

    const { readFile } = await import('node:fs/promises');
    const mp4Bytes = await readFile(outPath);
    await storage.put(targetKey, mp4Bytes, 'video/mp4');
    return { key: targetKey, tmpDir };
  } catch (err) {
    console.warn(
      '[agent:worker] ffmpeg transcode failed:',
      err instanceof Error ? err.message : String(err),
    );
    // Clean up the tmpDir if transcode failed (caller won't get it back to clean up).
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
    return undefined;
  }
}

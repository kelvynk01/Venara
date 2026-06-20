/**
 * processors/capture.ts — BullMQ processor for the `capture` queue (Brief §8/§13).
 *
 * Payload: { jobRecordId, captureId, workspaceId }
 *
 * Flow:
 *   1. Build WorkspaceScope; fetch capture + connected app (workspace-scoped).
 *   2. Set capture status → capturing.
 *   3. Resolve credentials if loginMode=credentials.
 *   4. Run CaptureSession (Browserbase → Playwright → record).
 *   5. Upload DOM snapshot, visual snapshot, and (if recording available) transcoded MP4 to R2.
 *   6. Update Capture row with artifact keys, status=done, durationMs.
 *   7. On any failure: set status=failed on the Capture row and rethrow for BullMQ retry.
 *
 * Follows the canonical noop.ts try/finally shape so the Job mirror always
 * transitions to a terminal state (Brief §13).
 *
 * Security: credential values are NEVER logged (Brief §17).
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Job } from 'bullmq';
import { CaptureSession } from '@venara/capture';
import type { CaptureStep, CaptureSessionState } from '@venara/capture';
import {
  getCaptureWithApp,
  resolveSecret,
  setAppSession,
  updateCapture,
  updateJobStatus,
  type WorkspaceScope,
} from '@venara/db';
import { getStorage, storageKeys } from '@venara/storage';

const execFileAsync = promisify(execFile);

// ─── Job payload ──────────────────────────────────────────────────────────────

interface CaptureJobData {
  jobRecordId: string;
  captureId: string;
  workspaceId: string;
}

// ─── Processor ───────────────────────────────────────────────────────────────

export async function processCapture(job: Job<CaptureJobData>): Promise<{ ok: true }> {
  const { jobRecordId, captureId, workspaceId } = job.data;

  // Transition Job mirror → active.
  if (jobRecordId) {
    await updateJobStatus({ id: jobRecordId, status: 'active', attempts: job.attemptsMade });
  }

  const scope: WorkspaceScope = { workspaceId };

  try {
    // 1. Fetch capture + connected app (workspace-scoped).
    const capture = await getCaptureWithApp(scope, captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found in workspace ${workspaceId}`);
    }
    const app = capture.flow.connectedApp;

    // 2. Set capture status → capturing.
    await updateCapture(scope, captureId, { status: 'capturing' });

    // 3. Resolve the captured auth session if loginMode=session (ADR-001).
    //    If the app needs auth but has no active session, pause immediately — don't burn a
    //    Browserbase session we know will hit a login wall.
    let sessionState: CaptureSessionState | undefined;
    if (app.loginMode === 'session') {
      if (app.sessionStatus !== 'active' || !app.credentialsRef) {
        return await pauseForReauth(scope, app.id, captureId, jobRecordId, job.attemptsMade);
      }
      const plaintext = await resolveSecret(scope, app.credentialsRef);
      if (!plaintext) {
        return await pauseForReauth(scope, app.id, captureId, jobRecordId, job.attemptsMade);
      }
      try {
        // NOTE: session values are NEVER logged (Brief §17).
        sessionState = JSON.parse(plaintext) as CaptureSessionState;
      } catch {
        return await pauseForReauth(scope, app.id, captureId, jobRecordId, job.attemptsMade);
      }
    }

    // 4. Build step script from the flow's stepsJson, or use a minimal default.
    const steps: CaptureStep[] = parseSteps(capture.flow.stepsJson, app.baseUrl);

    // 5. Run the capture session.
    const session = new CaptureSession();
    const result = await session.run({
      baseUrl: app.baseUrl,
      steps,
      sessionState,
    });

    // 5b. Session expired mid-run → pause recaptures and prompt reconnect (don't fail-retry).
    if (result.outcome === 'needs_reauth') {
      return await pauseForReauth(scope, app.id, captureId, jobRecordId, job.attemptsMade);
    }

    // 6. Upload artifacts to R2.
    const storage = getStorage();
    const keys = storageKeys.capture(workspaceId, captureId);

    await storage.put(keys.dom, result.domSnapshot, 'application/json');
    await storage.put(keys.visual, result.visualSnapshot, 'image/png');

    let rawVideoKey: string | undefined;

    // 7. Transcode HLS → MP4 if a recording playlist is available (best-effort).
    if (result.recordingPlaylistUrl) {
      rawVideoKey = await transcodeHlsToMp4(result.recordingPlaylistUrl, keys.raw, storage);
    }

    // 8. Persist the completed capture record.
    await updateCapture(scope, captureId, {
      status: 'done',
      browserbaseSessionId: result.browserbaseSessionId,
      rawVideoKey: rawVideoKey,
      domSnapshotKey: keys.dom,
      visualSnapshotKey: keys.visual,
      durationMs: result.durationMs,
    });

    // Transition Job mirror → completed.
    if (jobRecordId) {
      await updateJobStatus({ id: jobRecordId, status: 'completed', attempts: job.attemptsMade });
    }

    return { ok: true };
  } catch (err) {
    // Mark the capture as failed.
    await updateCapture(scope, captureId, { status: 'failed' }).catch(() => undefined);

    // Transition Job mirror → failed.
    if (jobRecordId) {
      await updateJobStatus({
        id: jobRecordId,
        status: 'failed',
        attempts: job.attemptsMade,
        lastError: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }

    // Rethrow so BullMQ records the failure and schedules the retry.
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Handle an app whose auth session is missing/expired (ADR-001): mark the session
 * `expired` so the dashboard prompts a reconnect, fail this capture (no take produced),
 * and complete the job WITHOUT throwing — retrying won't help until the user re-auths.
 */
async function pauseForReauth(
  scope: WorkspaceScope,
  appId: string,
  captureId: string,
  jobRecordId: string,
  attempts: number,
): Promise<{ ok: true }> {
  await setAppSession(scope, appId, { sessionStatus: 'expired' }).catch(() => undefined);
  await updateCapture(scope, captureId, { status: 'failed' }).catch(() => undefined);
  if (jobRecordId) {
    await updateJobStatus({ id: jobRecordId, status: 'completed', attempts }).catch(() => undefined);
  }
  console.warn(`[capture:worker] app ${appId} needs re-authentication — recaptures paused`);
  return { ok: true };
}

/**
 * Parse stepsJson from the Flow row back into CaptureStep[].
 * Falls back to a minimal default if the JSON is absent or malformed.
 */
function parseSteps(
  stepsJson: import('@prisma/client').Prisma.JsonValue,
  baseUrl: string,
): CaptureStep[] {
  if (Array.isArray(stepsJson) && stepsJson.length > 0) {
    // Each element came from our own createFlow call, so casting is safe.
    return stepsJson as unknown as CaptureStep[];
  }
  // Fallback: minimal script (Phase 2 Done Criteria — Brief §19).
  return [
    { tool: 'navigate', args: { url: baseUrl }, label: 'Navigate to app' },
    { tool: 'screenshot', args: {}, label: 'Initial screenshot' },
    { tool: 'markBeat', args: { label: 'start' }, label: 'Mark start beat' },
  ];
}

/**
 * Transcode an HLS playlist URL to MP4 via ffmpeg (`-c copy` — no re-encode).
 * Writes output to a temp file, uploads to R2, then cleans up.
 *
 * Best-effort: returns undefined on any failure without throwing.
 */
async function transcodeHlsToMp4(
  playlistUrl: string,
  targetKey: string,
  storage: import('@venara/storage').StorageProvider,
): Promise<string | undefined> {
  let tmpDir: string | undefined;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'venara-capture-'));
    const outPath = join(tmpDir, 'raw.mp4');

    // `ffmpeg -i <m3u8> -c copy raw.mp4` — stream copy, no transcoding (Brief §2).
    await execFileAsync('ffmpeg', [
      '-i', playlistUrl,
      '-c', 'copy',
      '-y',          // overwrite output
      outPath,
    ], { timeout: 5 * 60 * 1000 }); // 5-minute hard limit

    const { readFile } = await import('node:fs/promises');
    const mp4Bytes = await readFile(outPath);
    await storage.put(targetKey, mp4Bytes, 'video/mp4');
    return targetKey;
  } catch (err) {
    // Best-effort — capture still succeeds without video (Brief §8).
    console.warn(
      '[capture:worker] ffmpeg transcode failed:',
      err instanceof Error ? err.message : String(err),
    );
    return undefined;
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

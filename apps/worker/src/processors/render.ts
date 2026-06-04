/**
 * processors/render.ts — BullMQ processor for the `render` queue (Brief §10/§13).
 *
 * Payload: { jobRecordId, videoId, renderId, workspaceId }
 *
 * Flow:
 *   1. Build WorkspaceScope; fetch render + video + capture chain (workspace-scoped).
 *   2. Set render status → rendering.
 *   3. Pull raw capture MP4 from R2 to a temp file (`storage.get`).
 *   4. Build narration text from beats; apply pronunciation lexicon.
 *   5. Call ElevenLabs TTS → vo.mp3 + alignment.
 *   6. Build SRT captions from alignment.
 *   7. Run FFmpeg render pipeline (renderHowTo).
 *   8. Upload mp4/thumb/captions to R2 under storageKeys.render(workspaceId, renderId).
 *   9. updateRender({status:'done', mp4Key, thumbKey, captionsKey, durationMs}).
 *  10. Set Video status='ready', freshness='live', currentRenderId=renderId.
 *  11. On any failure: render 'failed', video 'failed', Job mirror 'failed'. Rethrow.
 *
 * Follows the canonical try/finally Job-mirror shape from noop.ts (Brief §13).
 * Temp files are always cleaned up in finally.
 *
 * Security: pronunciation lexicon is not a secret — it is app config (Brief §17).
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Job } from 'bullmq';
import { buildNarration, buildSrt, cleanupRenderDir, renderHowTo } from '@venara/render';
import { applyLexicon, getTts } from '@venara/tts';
import {
  fromAspectEnum,
  getRenderWithChain,
  setVideoCurrentRender,
  updateJobStatus,
  updateRender,
  updateVideo,
  type WorkspaceScope,
} from '@venara/db';
import { getStorage, storageKeys } from '@venara/storage';

// ─── Job payload ──────────────────────────────────────────────────────────────

interface RenderJobData {
  jobRecordId: string;
  videoId: string;
  renderId: string;
  workspaceId: string;
}

// ─── Processor ───────────────────────────────────────────────────────────────

export async function processRender(job: Job<RenderJobData>): Promise<{ ok: true }> {
  const { jobRecordId, renderId, workspaceId } = job.data;

  // Transition Job mirror → active.
  if (jobRecordId) {
    await updateJobStatus({ id: jobRecordId, status: 'active', attempts: job.attemptsMade });
  }

  const scope: WorkspaceScope = { workspaceId };

  // We track the tmpDir for cleanup — must be available in finally.
  let renderTmpDir: string | undefined;
  // Temp dir for the raw capture download.
  let captureTmpDir: string | undefined;

  try {
    // 1. Fetch render + video + connectedApp + capture (workspace-scoped).
    const renderRow = await getRenderWithChain(scope, renderId);
    if (!renderRow) {
      throw new Error(`Render ${renderId} not found in workspace ${workspaceId}`);
    }

    const video = renderRow.video;
    const app = video.connectedApp;
    const capture = video.capture;

    // Require a done capture with a rawVideoKey.
    // If the video was created before a capture completed, we check the flow's latest capture.
    let rawVideoKey: string | null = capture?.rawVideoKey ?? null;

    if (!rawVideoKey) {
      throw new Error(
        `No raw video key available for video ${video.id}. ` +
          'Ensure the capture completed successfully before rendering.',
      );
    }

    // 2. Set render status → rendering.
    await updateRender(scope, renderId, { status: 'rendering' });

    // 3. Pull the raw capture MP4 from R2 to a temp file.
    const { mkdtemp } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');

    captureTmpDir = await mkdtemp(join(tmpdir(), 'venara-cap-'));
    const captureFilePath = join(captureTmpDir, 'capture.mp4');

    const storage = getStorage();
    const captureBytes = await storage.get(rawVideoKey);
    await writeFile(captureFilePath, captureBytes);

    // 4. Build beats from the flow's stepsJson (markBeat entries).
    const beats = extractBeats(video.flow?.stepsJson ?? null);

    // 5. Build narration text; apply pronunciation lexicon.
    const rawNarration = buildNarration(beats);
    const lexicon = extractLexicon(app.pronunciation);
    const narrationText = applyLexicon(rawNarration, lexicon);

    // 6. Call TTS.
    const tts = getTts();
    const ttsResult = await tts.synthesize(narrationText, {
      // Lexicon already applied above — pass empty to avoid double substitution.
      lexicon: [],
    });

    // 7. Build SRT captions.
    let captionsSrt: string;
    if (ttsResult.alignment) {
      captionsSrt = buildSrt(ttsResult.alignment);
    } else {
      // Fallback: one caption per beat.
      const fallbackSentences = beats.map((b, i) => ({
        text: `Step ${i + 1}: ${b.label}`,
        startMs: b.atMs,
        endMs: b.atMs + 3000,
      }));
      captionsSrt = buildSrt(fallbackSentences);
    }

    // 8. Run FFmpeg how-to render pipeline.
    const aspect = fromAspectEnum(renderRow.aspect);
    const renderOutput = await renderHowTo({
      captureFilePath,
      beats,
      narrationText,
      voiceoverBytes: ttsResult.audio,
      voiceDurationMs: ttsResult.durationMs,
      captionsSrt,
      aspect,
    });

    renderTmpDir = renderOutput.tmpDir;

    // 9. Upload artifacts to R2.
    const rKeys = storageKeys.render(workspaceId, renderId);
    const { readFile } = await import('node:fs/promises');

    const [mp4Bytes, thumbBytes, captionBytes] = await Promise.all([
      readFile(renderOutput.mp4Path),
      readFile(renderOutput.thumbPath),
      readFile(renderOutput.captionsPath),
    ]);

    await Promise.all([
      storage.put(rKeys.mp4, mp4Bytes, 'video/mp4'),
      storage.put(rKeys.thumb, thumbBytes, 'image/jpeg'),
      storage.put(rKeys.captions, captionBytes, 'text/vtt'),
    ]);

    // 10. Update render row → done.
    await updateRender(scope, renderId, {
      status: 'done',
      mp4Key: rKeys.mp4,
      thumbKey: rKeys.thumb,
      captionsKey: rKeys.captions,
      durationMs: renderOutput.durationMs,
    });

    // 11. Mark video as ready + live + point to this render.
    await updateVideo(scope, video.id, {
      status: 'ready',
      freshness: 'live',
    });
    await setVideoCurrentRender(scope, video.id, renderId);

    // Transition Job mirror → completed.
    if (jobRecordId) {
      await updateJobStatus({ id: jobRecordId, status: 'completed', attempts: job.attemptsMade });
    }

    return { ok: true };
  } catch (err) {
    // Mark render + video as failed (best-effort — don't throw from the catch itself).
    await updateRender(scope, renderId, { status: 'failed' }).catch(() => undefined);
    await updateVideo(scope, job.data.videoId, { status: 'failed' }).catch(() => undefined);

    // Transition Job mirror → failed.
    if (jobRecordId) {
      await updateJobStatus({
        id: jobRecordId,
        status: 'failed',
        attempts: job.attemptsMade,
        lastError: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }

    // Rethrow so BullMQ records the failure and schedules any retry.
    throw err;
  } finally {
    // Always clean up temp dirs to avoid disk exhaustion (Brief §10).
    if (renderTmpDir) {
      await cleanupRenderDir(renderTmpDir);
    }
    if (captureTmpDir) {
      const { rm } = await import('node:fs/promises');
      await rm(captureTmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Beat {
  label: string;
  atMs: number;
}

/**
 * Extract markBeat entries from a flow's stepsJson.
 * Returns an empty array if stepsJson is absent or malformed.
 */
function extractBeats(stepsJson: import('@prisma/client').Prisma.JsonValue | null): Beat[] {
  if (!Array.isArray(stepsJson)) return [];

  const beats: Beat[] = [];
  for (const step of stepsJson) {
    if (
      step !== null &&
      typeof step === 'object' &&
      !Array.isArray(step) &&
      'tool' in step &&
      step['tool'] === 'markBeat'
    ) {
      const args = 'args' in step ? step['args'] : null;
      const label =
        args !== null && typeof args === 'object' && !Array.isArray(args) && 'label' in args
          ? String(args['label'])
          : 'Step';
      // atMs defaults to 0 if not recorded; the render worker uses beat order, not exact ms.
      const atMs =
        args !== null && typeof args === 'object' && !Array.isArray(args) && 'atMs' in args
          ? Number(args['atMs'])
          : 0;
      beats.push({ label, atMs });
    }
  }
  return beats;
}

/**
 * Extract the pronunciation lexicon from a ConnectedApp's pronunciation JSON field.
 * Returns undefined if absent or malformed.
 */
function extractLexicon(
  pronunciation: import('@prisma/client').Prisma.JsonValue | null,
): { term: string; say: string }[] | undefined {
  if (!pronunciation || typeof pronunciation !== 'object' || Array.isArray(pronunciation)) {
    return undefined;
  }
  // pronunciation: { name?: string, lexicon?: { term: string, say: string }[] }
  const raw = pronunciation as Record<string, unknown>;
  const lexicon = raw['lexicon'];
  if (!Array.isArray(lexicon)) return undefined;

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

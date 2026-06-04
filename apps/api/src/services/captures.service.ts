/**
 * captures.service.ts — orchestrate a capture run (Brief §8/§12).
 *
 * POST /v1/apps/:id/capture flow:
 *   1. Verify the app belongs to the caller's workspace.
 *   2. Create a Flow to hold the step script intent.
 *   3. Create a Capture (status: queued) under that flow.
 *   4. Enqueue the capture job so the worker does the actual work.
 *   5. Return { captureId } immediately — the frontend polls GET /v1/captures/:id.
 *
 * GET /v1/captures/:id flow:
 *   Return the capture status + signed R2 URLs when artifacts are available.
 *
 * All DB calls use workspace-scoped helpers — never raw prisma (Brief §6/§17).
 */
import {
  createCapture,
  createFlow,
  getCaptureWithApp,
  getConnectedApp,
  type WorkspaceScope,
} from '@venara/db';
import { getStorage, storageKeys } from '@venara/storage';
import type { CaptureRequestInput } from '@venara/shared';
import { NotFoundError } from '../lib/errors';
import { enqueue } from '../queue/queues';
import { QUEUE_NAMES } from '@venara/shared';

// ─── Default step script (Phase 2 Done Criteria) ─────────────────────────────

/**
 * When the caller omits `steps`, run a minimal hardcoded script that satisfies the
 * Phase 2 Done Criteria: navigate to baseUrl → screenshot → markBeat (Brief §19).
 */
function defaultSteps(baseUrl: string) {
  return [
    { tool: 'navigate' as const, args: { url: baseUrl }, label: 'Navigate to app' },
    { tool: 'screenshot' as const, args: {}, label: 'Initial screenshot' },
    { tool: 'markBeat' as const, args: { label: 'start' }, label: 'Mark start beat' },
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StartCaptureResult {
  captureId: string;
  jobRecordId: string;
}

export async function startCapture(
  scope: WorkspaceScope,
  appId: string,
  input: CaptureRequestInput,
): Promise<StartCaptureResult> {
  // Verify the app exists in this workspace.
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');

  const steps = input.steps ?? defaultSteps(app.baseUrl);

  // Create the Flow that holds this capture's intent.
  const flow = await createFlow(scope, {
    connectedAppId: appId,
    title: 'Capture run',
    intent: 'manual capture via API',
    stepsJson: steps as unknown as import('@prisma/client').Prisma.InputJsonValue,
  });

  // Create the Capture row (status: queued).
  const capture = await createCapture(scope, { flowId: flow.id });

  // Enqueue — worker does the actual browser work (Brief §6/§13).
  const { jobRecordId } = await enqueue(QUEUE_NAMES.capture, 'capture', {
    captureId: capture.id,
    workspaceId: scope.workspaceId,
  });

  return { captureId: capture.id, jobRecordId };
}

export interface CaptureStatusResult {
  id: string;
  status: string;
  durationMs: number | null;
  browserbaseSessionId: string | null;
  /** Signed URL for the raw MP4 (present when status=done and artifact exists). */
  rawVideoUrl?: string;
  /** Signed URL for the DOM snapshot JSON. */
  domSnapshotUrl?: string;
  /** Signed URL for the visual PNG snapshot. */
  visualSnapshotUrl?: string;
  createdAt: string;
}

/** Signed-URL expiry for capture artifacts: 1 hour (Brief §16). */
const ARTIFACT_URL_EXPIRY_S = 3600;

export async function getCaptureStatus(
  scope: WorkspaceScope,
  captureId: string,
): Promise<CaptureStatusResult> {
  const capture = await getCaptureWithApp(scope, captureId);
  if (!capture) throw new NotFoundError('Capture not found.');

  const storage = getStorage();
  const keys = storageKeys.capture(scope.workspaceId, captureId);

  // Only generate signed URLs when the artifact key is stored (status=done).
  const [rawVideoUrl, domSnapshotUrl, visualSnapshotUrl] = await Promise.all([
    capture.rawVideoKey
      ? storage.getSignedUrl(capture.rawVideoKey, { expiresInSeconds: ARTIFACT_URL_EXPIRY_S })
      : Promise.resolve(undefined),
    capture.domSnapshotKey
      ? storage.getSignedUrl(capture.domSnapshotKey, { expiresInSeconds: ARTIFACT_URL_EXPIRY_S })
      : Promise.resolve(undefined),
    capture.visualSnapshotKey
      ? storage.getSignedUrl(capture.visualSnapshotKey, { expiresInSeconds: ARTIFACT_URL_EXPIRY_S })
      : Promise.resolve(undefined),
  ]);

  // Suppress unused variable warning — keys is used for type safety / key-path centralisation.
  void keys;

  return {
    id: capture.id,
    status: capture.status,
    durationMs: capture.durationMs,
    browserbaseSessionId: capture.browserbaseSessionId,
    rawVideoUrl,
    domSnapshotUrl,
    visualSnapshotUrl,
    createdAt: capture.createdAt.toISOString(),
  };
}

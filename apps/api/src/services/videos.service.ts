/**
 * videos.service.ts — Video + render orchestration (Brief §10/§12).
 *
 * POST /v1/apps/:id/videos flow:
 *   1. Verify the flow + capture belong to this workspace.
 *   2. Default aspect by type (how-to → 16:9, marketing → 9:16).
 *   3. Create Video (draft) + Render (queued) rows.
 *   4. Set Video.currentRenderId.
 *   5. Enqueue a render job.
 *   6. Return VideoPublic.
 *
 * GET endpoints return signed media URLs from R2 when the render is done.
 *
 * All DB calls use workspace-scoped helpers — never raw prisma (Brief §6/§17).
 */
import {
  createRender,
  createVideo,
  fromAspectEnum,
  getConnectedApp,
  getRenderWithChain,
  listFlowsForApp,
  listVideosForApp,
  setVideoCurrentRender,
  getVideoWithCurrentRender,
  type WorkspaceScope,
} from '@venara/db';
import { getStorage } from '@venara/storage';
import type { CreateVideoInput, FlowPublic, RenderPublic, VideoPublic } from '@venara/shared';
import { QUEUE_NAMES } from '@venara/shared';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { enqueue } from '../queue/queues';

// ─── Default aspect per video type ───────────────────────────────────────────

function defaultAspect(type: 'howto' | 'marketing'): '16:9' | '9:16' {
  return type === 'howto' ? '16:9' : '9:16';
}

// ─── Signed-URL expiry ────────────────────────────────────────────────────────

const MEDIA_URL_EXPIRY_S = 3600;

// ─── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Build a RenderPublic from a Prisma Render row + optional signed URLs.
 * Signed URLs are only generated when status=done and the artifact keys are present.
 */
async function toPublicRender(
  render: {
    id: string;
    aspect: import('@prisma/client').RenderAspect;
    status: import('@prisma/client').RenderStatus;
    durationMs: number | null;
    mp4Key: string | null;
    thumbKey: string | null;
    captionsKey: string | null;
  },
  // Signed URLs derive from the render's stored keys directly; these are retained for
  // call-site symmetry with the video shaper but are not needed here.
  _workspaceId: string,
  _renderId: string,
): Promise<RenderPublic> {
  const storage = getStorage();

  let mp4Url: string | null = null;
  let thumbUrl: string | null = null;
  let captionsUrl: string | null = null;

  if (render.status === 'done') {
    const [m, t, c] = await Promise.all([
      render.mp4Key
        ? storage.getSignedUrl(render.mp4Key, { expiresInSeconds: MEDIA_URL_EXPIRY_S })
        : Promise.resolve(null),
      render.thumbKey
        ? storage.getSignedUrl(render.thumbKey, { expiresInSeconds: MEDIA_URL_EXPIRY_S })
        : Promise.resolve(null),
      render.captionsKey
        ? storage.getSignedUrl(render.captionsKey, { expiresInSeconds: MEDIA_URL_EXPIRY_S })
        : Promise.resolve(null),
    ]);
    mp4Url = m;
    thumbUrl = t;
    captionsUrl = c;
  }

  return {
    id: render.id,
    aspect: fromAspectEnum(render.aspect),
    status: render.status,
    durationMs: render.durationMs,
    mp4Url,
    thumbUrl,
    captionsUrl,
  };
}

/**
 * Build a VideoPublic from a video row + its current render (if any).
 * Resolves signed URLs for the current render when done.
 */
async function toPublicVideo(
  video: {
    id: string;
    connectedAppId: string;
    flowId: string;
    type: import('@prisma/client').VideoType;
    title: string;
    status: import('@prisma/client').VideoStatus;
    freshness: import('@prisma/client').Freshness;
    createdAt: Date;
    currentRenderId: string | null;
    renders: Array<{
      id: string;
      aspect: import('@prisma/client').RenderAspect;
      status: import('@prisma/client').RenderStatus;
      durationMs: number | null;
      mp4Key: string | null;
      thumbKey: string | null;
      captionsKey: string | null;
    }>;
  },
  workspaceId: string,
): Promise<VideoPublic> {
  // Find the current render by currentRenderId pointer.
  const currentRenderRow = video.currentRenderId
    ? (video.renders.find((r) => r.id === video.currentRenderId) ?? video.renders[0] ?? null)
    : (video.renders[0] ?? null);

  const currentRender = currentRenderRow
    ? await toPublicRender(currentRenderRow, workspaceId, currentRenderRow.id)
    : null;

  return {
    id: video.id,
    connectedAppId: video.connectedAppId,
    flowId: video.flowId,
    type: video.type,
    title: video.title,
    status: video.status,
    freshness: video.freshness,
    createdAt: video.createdAt.toISOString(),
    currentRender,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

export interface CreateVideoResult {
  video: VideoPublic;
  jobRecordId: string;
}

/** POST /v1/apps/:appId/videos — create a video from a flow capture. */
export async function createVideoForApp(
  scope: WorkspaceScope,
  appId: string,
  input: CreateVideoInput,
): Promise<CreateVideoResult> {
  // Verify the app belongs to this workspace.
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');

  // Verify the flow belongs to this app by querying flows for the app — scoped.
  const flows = await listFlowsForApp(scope, appId);
  const flow = flows.find((f) => f.id === input.flowId);
  if (!flow) throw new NotFoundError('Flow not found in this app.');

  // Verify there's a completed capture available (render worker requires a rawVideoKey).
  // We don't gate hard here — the render worker will surface a clear error if missing.
  // The flow's latestCaptureStatus is already resolved by listFlowsForApp.

  const aspect = input.aspect ?? defaultAspect(input.type);

  // Create the Video row (captureId is nullable; the worker resolves from flow.capture).
  const video = await createVideo(scope, {
    connectedAppId: appId,
    flowId: input.flowId,
    type: input.type,
    title: `${flow.title} — ${input.type === 'howto' ? 'How-to' : 'Marketing'}`,
  });

  // Create the initial Render row (status: queued).
  const render = await createRender(scope, {
    videoId: video.id,
    aspect,
  });

  // Set the video's currentRenderId pointer.
  await setVideoCurrentRender(scope, video.id, render.id);

  // Enqueue the render job — worker does the actual render work (Brief §6/§13).
  const { jobRecordId } = await enqueue(QUEUE_NAMES.render, 'render', {
    videoId: video.id,
    renderId: render.id,
    workspaceId: scope.workspaceId,
  });

  // Fetch the complete video for the response.
  const fullVideo = await getVideoWithCurrentRender(scope, video.id);
  if (!fullVideo) throw new NotFoundError('Video not found after creation.');

  const publicVideo = await toPublicVideo(fullVideo, scope.workspaceId);

  return { video: publicVideo, jobRecordId };
}

/** GET /v1/apps/:appId/videos — list all videos for an app. */
export async function listVideos(scope: WorkspaceScope, appId: string): Promise<VideoPublic[]> {
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');

  const videos = await listVideosForApp(scope, appId);
  return Promise.all(videos.map((v) => toPublicVideo(v, scope.workspaceId)));
}

/** GET /v1/videos/:id — get a single video with current render + signed URLs. */
export async function getVideo(scope: WorkspaceScope, id: string): Promise<VideoPublic> {
  const video = await getVideoWithCurrentRender(scope, id);
  if (!video) throw new NotFoundError('Video not found.');
  return toPublicVideo(video, scope.workspaceId);
}

/** GET /v1/videos/:id/download — return a signed download URL for the MP4. */
export async function getDownloadUrl(scope: WorkspaceScope, videoId: string): Promise<string> {
  const video = await getVideoWithCurrentRender(scope, videoId);
  if (!video) throw new NotFoundError('Video not found.');

  const renderId = video.currentRenderId;
  if (!renderId) throw new BadRequestError('This video has no completed render yet.');

  const render = await getRenderWithChain(scope, renderId);
  if (!render) throw new NotFoundError('Render not found.');
  if (render.status !== 'done' || !render.mp4Key) {
    throw new BadRequestError('Render is not yet complete.');
  }

  const storage = getStorage();
  return storage.getSignedUrl(render.mp4Key, { expiresInSeconds: MEDIA_URL_EXPIRY_S });
}

/** GET /v1/apps/:appId/flows — list flows for an app with latest capture status. */
export async function listFlows(scope: WorkspaceScope, appId: string): Promise<FlowPublic[]> {
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');

  const flows = await listFlowsForApp(scope, appId);
  return flows.map((f) => ({
    id: f.id,
    title: f.title,
    intent: f.intent ?? null,
    status: f.status,
    latestCaptureStatus: f.latestCaptureStatus,
    createdAt: f.createdAt.toISOString(),
  }));
}

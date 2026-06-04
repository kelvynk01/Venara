/**
 * queries/videos.ts — workspace-scoped Video, Render, and Flow helpers (Brief §7/§10).
 *
 * Videos belong to a ConnectedApp → Workspace; Renders belong to a Video.
 * All helpers enforce tenant isolation through the connectedApp.workspaceId join —
 * never trusting a raw id alone (Brief §17).
 *
 * The Prisma `RenderAspect` enum uses `RATIO_16_9` etc. internally, but the public
 * API and shared types use the colon form `'16:9'`. Use `toAspectEnum` /
 * `fromAspectEnum` to convert at the boundary (never raw-compare strings).
 */
import type { Freshness, Prisma, RenderAspect, RenderStatus, VideoStatus, VideoType } from '@prisma/client';
import { prisma } from '../client';
import type { WorkspaceScope } from '../scope';

// ─── RenderAspect ↔ API string ────────────────────────────────────────────────

/**
 * Map the public colon-form aspect string to the Prisma `RenderAspect` enum value.
 * Throws on unknown values so callers get a clear error rather than a silent null.
 */
export function toAspectEnum(aspect: '16:9' | '9:16' | '1:1'): RenderAspect {
  const map: Record<string, RenderAspect> = {
    '16:9': 'RATIO_16_9',
    '9:16': 'RATIO_9_16',
    '1:1': 'RATIO_1_1',
  };
  const value = map[aspect];
  if (!value) throw new Error(`Unknown aspect ratio: ${aspect}`);
  return value;
}

/**
 * Map the Prisma `RenderAspect` enum value back to the public colon-form string.
 */
export function fromAspectEnum(aspect: RenderAspect): '16:9' | '9:16' | '1:1' {
  const map: Record<RenderAspect, '16:9' | '9:16' | '1:1'> = {
    RATIO_16_9: '16:9',
    RATIO_9_16: '9:16',
    RATIO_1_1: '1:1',
  };
  const value = map[aspect];
  if (!value) throw new Error(`Unknown RenderAspect enum: ${aspect as string}`);
  return value;
}

// ─── Video helpers ────────────────────────────────────────────────────────────

export interface CreateVideoInput {
  connectedAppId: string;
  flowId: string;
  captureId?: string;
  type: VideoType;
  title: string;
}

/** Create a video row scoped to the workspace (via connectedApp ownership check). */
export async function createVideo(scope: WorkspaceScope, input: CreateVideoInput) {
  // Verify the app belongs to this workspace.
  const app = await prisma.connectedApp.findFirst({
    where: { id: input.connectedAppId, workspaceId: scope.workspaceId },
    select: { id: true },
  });
  if (!app) throw new Error('Connected app not found in workspace.');

  return prisma.video.create({
    data: {
      connectedAppId: input.connectedAppId,
      flowId: input.flowId,
      captureId: input.captureId ?? null,
      type: input.type,
      title: input.title,
      status: 'draft',
      freshness: 'live',
    },
  });
}

/** Update video status / freshness / currentRenderId (scoped through connectedApp). */
export function updateVideo(
  scope: WorkspaceScope,
  id: string,
  data: {
    status?: VideoStatus;
    freshness?: Freshness;
    currentRenderId?: string | null;
  },
) {
  return prisma.video.updateMany({
    where: { id, connectedApp: { workspaceId: scope.workspaceId } },
    data,
  });
}

/**
 * Set the video's currentRenderId pointer (called after render queued + after render done).
 * Scoped through connectedApp → workspace.
 */
export function setVideoCurrentRender(
  scope: WorkspaceScope,
  videoId: string,
  renderId: string,
) {
  return prisma.video.updateMany({
    where: { id: videoId, connectedApp: { workspaceId: scope.workspaceId } },
    data: { currentRenderId: renderId },
  });
}

/** Get a video with its currentRender row, scoped to the workspace. */
export function getVideoWithCurrentRender(scope: WorkspaceScope, id: string) {
  return prisma.video.findFirst({
    where: { id, connectedApp: { workspaceId: scope.workspaceId } },
    include: {
      // Prisma relation name is `renders` (plural) matching the schema relation.
      // Service layer prefers the row matching currentRenderId; window is wide enough
      // to include it even after many re-renders (Phase 6 regenerate). TODO: when
      // re-renders are unbounded, fetch the currentRender by id directly.
      renders: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
}

/** List all videos for an app (scoped to workspace). */
export function listVideosForApp(scope: WorkspaceScope, appId: string) {
  return prisma.video.findMany({
    where: { connectedAppId: appId, connectedApp: { workspaceId: scope.workspaceId } },
    include: {
      renders: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Render helpers ───────────────────────────────────────────────────────────

export interface CreateRenderInput {
  videoId: string;
  aspect: '16:9' | '9:16' | '1:1';
  scriptJson?: Prisma.InputJsonValue;
}

/** Create a Render row for a video (videoId must belong to this workspace). */
export async function createRender(scope: WorkspaceScope, input: CreateRenderInput) {
  // Verify the video belongs to this workspace.
  const video = await prisma.video.findFirst({
    where: { id: input.videoId, connectedApp: { workspaceId: scope.workspaceId } },
    select: { id: true },
  });
  if (!video) throw new Error('Video not found in workspace.');

  return prisma.render.create({
    data: {
      videoId: input.videoId,
      aspect: toAspectEnum(input.aspect),
      scriptJson: input.scriptJson,
      status: 'queued',
    },
  });
}

/** Update a render row (scoped through video → connectedApp → workspace). */
export function updateRender(
  scope: WorkspaceScope,
  id: string,
  data: {
    status?: RenderStatus;
    mp4Key?: string | null;
    thumbKey?: string | null;
    captionsKey?: string | null;
    durationMs?: number | null;
  },
) {
  return prisma.render.updateMany({
    where: { id, video: { connectedApp: { workspaceId: scope.workspaceId } } },
    data,
  });
}

/**
 * Fetch a render with its video → connectedApp + flow + capture chain (for the worker, scoped).
 * Returns null if the render doesn't belong to the workspace.
 */
export function getRenderWithChain(scope: WorkspaceScope, renderId: string) {
  return prisma.render.findFirst({
    where: { id: renderId, video: { connectedApp: { workspaceId: scope.workspaceId } } },
    include: {
      video: {
        include: {
          connectedApp: true,
          capture: true,
          flow: true,
        },
      },
    },
  });
}

// ─── Flow list helper ─────────────────────────────────────────────────────────

/**
 * List flows for an app with the latest capture status on each.
 * Scoped: app must belong to the workspace.
 */
export async function listFlowsForApp(scope: WorkspaceScope, appId: string) {
  // Verify app ownership first.
  const app = await prisma.connectedApp.findFirst({
    where: { id: appId, workspaceId: scope.workspaceId },
    select: { id: true },
  });
  if (!app) throw new Error('Connected app not found in workspace.');

  const flows = await prisma.flow.findMany({
    // Inline the workspace scope (not just the pre-check) so the query is self-guarding.
    where: { connectedAppId: appId, connectedApp: { workspaceId: scope.workspaceId } },
    include: {
      captures: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return flows.map((flow) => ({
    ...flow,
    latestCaptureStatus: flow.captures[0]?.status ?? null,
  }));
}

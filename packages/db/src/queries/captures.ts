/**
 * queries/captures.ts — Flow + Capture helpers (Brief §7/§8).
 *
 * A Capture belongs to a Flow → ConnectedApp → Workspace. There is no direct workspaceId
 * column on Flow/Capture, so every helper enforces tenant isolation through the
 * `flow.connectedApp.workspaceId` join — never trusting a raw id alone (Brief §17).
 */
import type { CaptureStatus, Prisma } from '@prisma/client';
import { prisma } from '../client';
import type { WorkspaceScope } from '../scope';

/** Create a flow under a connected app (scoped), with an optional step script. */
export async function createFlow(
  scope: WorkspaceScope,
  input: { connectedAppId: string; title: string; intent?: string; stepsJson?: Prisma.InputJsonValue },
) {
  // Ensure the app belongs to the caller's workspace before attaching a flow.
  const app = await prisma.connectedApp.findFirst({
    where: { id: input.connectedAppId, workspaceId: scope.workspaceId },
    select: { id: true },
  });
  if (!app) throw new Error('Connected app not found in workspace.');

  return prisma.flow.create({
    data: {
      connectedAppId: input.connectedAppId,
      title: input.title,
      intent: input.intent,
      stepsJson: input.stepsJson,
      status: 'requested',
    },
  });
}

/** Create a capture for a flow, verifying the flow belongs to the workspace first. */
export async function createCapture(scope: WorkspaceScope, input: { flowId: string }) {
  const flow = await prisma.flow.findFirst({
    where: { id: input.flowId, connectedApp: { workspaceId: scope.workspaceId } },
    select: { id: true },
  });
  if (!flow) throw new Error('Flow not found in workspace.');

  return prisma.capture.create({
    data: { flowId: input.flowId, status: 'queued' },
  });
}

/** Update a capture, scoped through the flow → app → workspace chain. */
export function updateCapture(
  scope: WorkspaceScope,
  id: string,
  data: {
    status?: CaptureStatus;
    browserbaseSessionId?: string;
    rawVideoKey?: string;
    domSnapshotKey?: string;
    visualSnapshotKey?: string;
    durationMs?: number;
  },
) {
  // No FK to workspaceId on Capture → use updateMany with the join filter.
  return prisma.capture.updateMany({
    where: { id, flow: { connectedApp: { workspaceId: scope.workspaceId } } },
    data,
  });
}

/** Worker-side fetch of a capture with its flow + app, scoped to a workspace. */
export function getCaptureWithApp(scope: WorkspaceScope, id: string) {
  return prisma.capture.findFirst({
    where: { id, flow: { connectedApp: { workspaceId: scope.workspaceId } } },
    include: { flow: { include: { connectedApp: true } } },
  });
}

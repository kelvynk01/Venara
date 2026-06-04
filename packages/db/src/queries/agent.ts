/**
 * queries/agent.ts — workspace-scoped AgentRequest helpers (Brief §9).
 *
 * AgentRequest carries a direct `workspaceId` column (unlike Flow/Capture which scope
 * through connectedApp), so every query here filters on that column directly — no join
 * traversal required. Never issue an unscoped query (Brief §17).
 */
import type { AgentRequestStatus, Prisma } from '@prisma/client';
import { prisma } from '../client';
import type { WorkspaceScope } from '../scope';

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateAgentRequestInput {
  connectedAppId: string;
  prompt: string;
}

/**
 * Create an AgentRequest, verifying the connectedApp belongs to this workspace
 * before attaching it. Returns the created row.
 */
export async function createAgentRequest(
  scope: WorkspaceScope,
  input: CreateAgentRequestInput,
) {
  // Ensure the app belongs to the caller's workspace before creating the request.
  const app = await prisma.connectedApp.findFirst({
    where: { id: input.connectedAppId, workspaceId: scope.workspaceId },
    select: { id: true },
  });
  if (!app) throw new Error('Connected app not found in workspace.');

  return prisma.agentRequest.create({
    data: {
      workspaceId: scope.workspaceId,
      connectedAppId: input.connectedAppId,
      prompt: input.prompt,
      status: 'planning',
    },
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a single AgentRequest by id, scoped to the workspace.
 * Returns null if it doesn't exist or belongs to a different workspace.
 */
export function getAgentRequest(scope: WorkspaceScope, id: string) {
  return prisma.agentRequest.findFirst({
    where: { id, workspaceId: scope.workspaceId },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateAgentRequestData {
  status?: AgentRequestStatus;
  parsedIntentJson?: Prisma.InputJsonValue;
  planJson?: Prisma.InputJsonValue;
  progressJson?: Prisma.InputJsonValue;
  question?: string | null;
  lastError?: string | null;
  resultVideoId?: string | null;
}

/**
 * Update an AgentRequest, scoped to the workspace.
 * Uses updateMany so we can include the workspaceId filter inline (never trust the raw id).
 */
export function updateAgentRequest(
  scope: WorkspaceScope,
  id: string,
  data: UpdateAgentRequestData,
) {
  return prisma.agentRequest.updateMany({
    where: { id, workspaceId: scope.workspaceId },
    data,
  });
}

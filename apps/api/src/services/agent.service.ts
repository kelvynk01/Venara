/**
 * agent.service.ts — AgentRequest orchestration (Brief §9/§12).
 *
 * POST /v1/apps/:id/agent → createAgentRun
 *   1. Verify the connected app belongs to this workspace.
 *   2. Create an AgentRequest row.
 *   3. Enqueue the agent job (phase=plan).
 *   4. Return AgentRequestPublic.
 *
 * GET  /v1/agent/:id → getAgentRun
 *   Return the AgentRequest as AgentRequestPublic.
 *
 * POST /v1/agent/:id/confirm → confirmAgentRun
 *   Only valid when status=needs_input.
 *   If confirm=true  → enqueue phase=execute and set status back to planning/capturing.
 *   If confirm=false → cancel: set status=failed with "cancelled by user".
 *
 * All DB calls use workspace-scoped helpers (Brief §17).
 */
import {
  createAgentRequest,
  getAgentRequest,
  updateAgentRequest,
  getConnectedApp,
  type WorkspaceScope,
} from '@venara/db';
import type {
  AgentRequestPublic,
  AgentProgressStep,
  CreateAgentRequestInput,
  ConfirmAgentRequestInput,
} from '@venara/shared';
import { QUEUE_NAMES } from '@venara/shared';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { enqueue } from '../queue/queues';

// ─── Shape helper ─────────────────────────────────────────────────────────────

function toPublicAgentRequest(
  row: Awaited<ReturnType<typeof getAgentRequest>> & object,
): AgentRequestPublic {
  const progress: AgentProgressStep[] = Array.isArray(row.progressJson)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- progressJson is untyped JSON; shape is validated by agentProgressStepSchema in shared
      (row.progressJson as any[]).map((s: unknown) => {
        if (
          s !== null &&
          typeof s === 'object' &&
          !Array.isArray(s) &&
          'label' in s &&
          'state' in s
        ) {
          const step = s as Record<string, unknown>;
          return {
            label: String(step['label']),
            state: String(step['state']) as AgentProgressStep['state'],
          };
        }
        return { label: '', state: 'pending' as const };
      })
    : [];

  return {
    id: row.id,
    connectedAppId: row.connectedAppId,
    prompt: row.prompt,
    status: row.status,
    progress,
    question: row.question ?? null,
    resultVideoId: row.resultVideoId ?? null,
    error: row.lastError ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/** POST /v1/apps/:appId/agent — start a conversational create run. */
export async function createAgentRun(
  scope: WorkspaceScope,
  appId: string,
  input: CreateAgentRequestInput,
): Promise<AgentRequestPublic> {
  // Verify the app belongs to this workspace.
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');

  // Create the AgentRequest row.
  const agentRequest = await createAgentRequest(scope, {
    connectedAppId: appId,
    prompt: input.prompt,
  });

  // Enqueue the agent job — phase=plan (worker does the actual work, Brief §6/§13).
  await enqueue(QUEUE_NAMES.agent, 'agent', {
    agentRequestId: agentRequest.id,
    workspaceId: scope.workspaceId,
    phase: 'plan',
  });

  return toPublicAgentRequest(agentRequest);
}

/** GET /v1/agent/:id — get a single AgentRequest as AgentRequestPublic. */
export async function getAgentRun(
  scope: WorkspaceScope,
  id: string,
): Promise<AgentRequestPublic> {
  const agentRequest = await getAgentRequest(scope, id);
  if (!agentRequest) throw new NotFoundError('Agent request not found.');
  return toPublicAgentRequest(agentRequest);
}

/** POST /v1/agent/:id/confirm — answer a CONFIRM gate question (Brief §9). */
export async function confirmAgentRun(
  scope: WorkspaceScope,
  id: string,
  input: ConfirmAgentRequestInput,
): Promise<AgentRequestPublic> {
  const agentRequest = await getAgentRequest(scope, id);
  if (!agentRequest) throw new NotFoundError('Agent request not found.');

  if (agentRequest.status !== 'needs_input') {
    throw new BadRequestError(
      `Cannot confirm an agent request with status "${agentRequest.status}". ` +
        'Only needs_input requests can be confirmed.',
    );
  }

  if (!input.confirm) {
    // User cancelled — mark as failed with a clear reason.
    await updateAgentRequest(scope, id, {
      status: 'failed',
      lastError: 'Cancelled by user.',
    });
    const updated = await getAgentRequest(scope, id);
    if (!updated) throw new NotFoundError('Agent request not found after update.');
    return toPublicAgentRequest(updated);
  }

  // User confirmed → enqueue the execute phase.
  // If a note was provided, we could append it to the prompt or plan — but to keep
  // it simple (Brief CONSTRAINTS: "keep it simple: cancel") we just proceed.
  // TODO(verify with live key): if note integration is needed, append the note to
  // agentRequest.prompt and re-run planPhase before executing.

  await updateAgentRequest(scope, id, {
    status: 'capturing',
    question: null,
  });

  await enqueue(QUEUE_NAMES.agent, 'agent', {
    agentRequestId: id,
    workspaceId: scope.workspaceId,
    phase: 'execute',
  });

  const updated = await getAgentRequest(scope, id);
  if (!updated) throw new NotFoundError('Agent request not found after update.');
  return toPublicAgentRequest(updated);
}

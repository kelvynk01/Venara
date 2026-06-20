/**
 * queries/apps.ts — workspace-scoped ConnectedApp helpers (Brief §6/§7).
 * Every query is scoped by workspaceId; `credentialsRef` is never selected back to
 * clients by callers (it's an internal reference, Brief §17).
 */
import type { ConnectedAppStatus, LoginMode, Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '../client';
import type { WorkspaceScope } from '../scope';

export interface CreateConnectedAppInput {
  name: string;
  baseUrl: string;
  loginMode: LoginMode;
  credentialsRef?: string | null;
  pronunciation?: Prisma.InputJsonValue;
}

export function createConnectedApp(scope: WorkspaceScope, input: CreateConnectedAppInput) {
  return prisma.connectedApp.create({
    data: {
      workspaceId: scope.workspaceId,
      name: input.name,
      baseUrl: input.baseUrl,
      loginMode: input.loginMode,
      credentialsRef: input.credentialsRef ?? null,
      pronunciation: input.pronunciation,
    },
  });
}

export function listConnectedApps(scope: WorkspaceScope) {
  return prisma.connectedApp.findMany({
    where: { workspaceId: scope.workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export function getConnectedApp(scope: WorkspaceScope, id: string) {
  return prisma.connectedApp.findFirst({
    where: { id, workspaceId: scope.workspaceId },
  });
}

// NOTE: credentialsRef and status are intentionally NOT updatable here. Credentials are
// managed only through the secret store; status transitions go through setAppStatus.
export interface UpdateConnectedAppInput {
  name?: string;
  pronunciation?: Prisma.InputJsonValue;
}

export function updateConnectedApp(
  scope: WorkspaceScope,
  id: string,
  input: UpdateConnectedAppInput,
) {
  return prisma.connectedApp.updateMany({
    where: { id, workspaceId: scope.workspaceId },
    data: input,
  });
}

export function setAppStatus(scope: WorkspaceScope, id: string, status: ConnectedAppStatus) {
  return prisma.connectedApp.updateMany({
    where: { id, workspaceId: scope.workspaceId },
    data: { status },
  });
}

/**
 * Attach (or refresh) the captured auth session for a loginMode=session app (ADR-001).
 * `credentialsRef` is the encrypted storageState reference; status becomes `active`.
 * Pass `credentialsRef: null` + status `expired` to mark a session as needing reconnect.
 */
export function setAppSession(
  scope: WorkspaceScope,
  id: string,
  input: { credentialsRef?: string | null; sessionStatus: SessionStatus; sessionCapturedAt?: Date | null },
) {
  return prisma.connectedApp.updateMany({
    where: { id, workspaceId: scope.workspaceId },
    data: {
      ...(input.credentialsRef !== undefined ? { credentialsRef: input.credentialsRef } : {}),
      sessionStatus: input.sessionStatus,
      ...(input.sessionCapturedAt !== undefined ? { sessionCapturedAt: input.sessionCapturedAt } : {}),
    },
  });
}

export function deleteConnectedApp(scope: WorkspaceScope, id: string) {
  return prisma.connectedApp.deleteMany({ where: { id, workspaceId: scope.workspaceId } });
}

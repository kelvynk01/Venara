/**
 * apps.service.ts — connected-app orchestration (Brief §6/§8/§17).
 *
 * Owns the secret-handling for connect/disconnect: credentials are encrypted via the
 * secret store and only a `credentialsRef` is persisted. Public shapes never include it.
 */
import {
  createConnectedApp,
  deleteConnectedApp,
  deleteSecret,
  getConnectedApp,
  listConnectedApps,
  serializeCredentials,
  storeSecret,
  updateConnectedApp,
  type ConnectedApp,
  type Prisma,
  type WorkspaceScope,
} from '@venara/db';
import type { ConnectAppInput, ConnectedAppPublic, UpdateAppInput } from '@venara/shared';
import { NotFoundError } from '../lib/errors';

function toPublicApp(app: ConnectedApp): ConnectedAppPublic {
  return {
    id: app.id,
    name: app.name,
    baseUrl: app.baseUrl,
    loginMode: app.loginMode,
    status: app.status,
    pronunciation: (app.pronunciation as ConnectedAppPublic['pronunciation']) ?? null,
    createdAt: app.createdAt.toISOString(),
  };
}

export async function connectApp(
  scope: WorkspaceScope,
  input: ConnectAppInput,
): Promise<ConnectedAppPublic> {
  let credentialsRef: string | null = null;
  if (input.loginMode === 'credentials' && input.credentials) {
    // Encrypt and store; only the reference is persisted on the app (Brief §17).
    credentialsRef = await storeSecret(scope, serializeCredentials(input.credentials));
  }

  try {
    const app = await createConnectedApp(scope, {
      name: input.name,
      baseUrl: input.baseUrl,
      loginMode: input.loginMode,
      credentialsRef,
      pronunciation: input.pronunciation as Prisma.InputJsonValue | undefined,
    });
    return toPublicApp(app);
  } catch (err) {
    // Don't leave an orphaned encrypted secret if the app row fails to write.
    if (credentialsRef) await deleteSecret(scope, credentialsRef).catch(() => undefined);
    throw err;
  }
}

export async function listApps(scope: WorkspaceScope): Promise<ConnectedAppPublic[]> {
  const apps = await listConnectedApps(scope);
  return apps.map(toPublicApp);
}

export async function getApp(scope: WorkspaceScope, id: string): Promise<ConnectedAppPublic> {
  const app = await getConnectedApp(scope, id);
  if (!app) throw new NotFoundError('Connected app not found.');
  return toPublicApp(app);
}

export async function updateApp(
  scope: WorkspaceScope,
  id: string,
  input: UpdateAppInput,
): Promise<ConnectedAppPublic> {
  const result = await updateConnectedApp(scope, id, {
    name: input.name,
    pronunciation: input.pronunciation as Prisma.InputJsonValue | undefined,
  });
  if (result.count === 0) throw new NotFoundError('Connected app not found.');
  return getApp(scope, id);
}

export async function disconnectApp(scope: WorkspaceScope, id: string): Promise<void> {
  const app = await getConnectedApp(scope, id);
  if (!app) throw new NotFoundError('Connected app not found.');
  // Purge the stored secret reference, then the app (Brief §18).
  if (app.credentialsRef) await deleteSecret(scope, app.credentialsRef);
  await deleteConnectedApp(scope, id);
}

/**
 * auth-handoff.service.ts — interactive login handoff for loginMode=session apps (ADR-001).
 *
 * start  → opens a non-recording hosted browser on the app's login page and returns an
 *          embeddable Live View URL for the dashboard to render.
 * complete → harvests the authenticated session (storageState) the user just established,
 *          encrypts it into the secret store, and marks the app's session `active`.
 *
 * Venara never sees a password — only the resulting session. Session values are never
 * logged or returned (Brief §17).
 */
import {
  startAuthHandoff,
  harvestAuthSession,
  endAuthSession,
  type AuthHandoffSession,
} from '@venara/capture';
import {
  deleteSecret,
  getConnectedApp,
  setAppSession,
  storeSecret,
  type WorkspaceScope,
} from '@venara/db';
import { BadRequestError, NotFoundError } from '../lib/errors';

/** Public shape of a started handoff — safe to return (no secrets). */
export interface StartAuthResult {
  sessionId: string;
  liveViewUrl: string;
  expiresAt: number;
}

export async function startAppAuth(
  scope: WorkspaceScope,
  appId: string,
): Promise<StartAuthResult> {
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');
  if (app.loginMode !== 'session') {
    throw new BadRequestError('This app is not configured for session login.');
  }
  const handoff: AuthHandoffSession = await startAuthHandoff(app.baseUrl);
  return {
    sessionId: handoff.sessionId,
    liveViewUrl: handoff.liveViewUrl,
    expiresAt: handoff.expiresAt,
  };
}

export async function completeAppAuth(
  scope: WorkspaceScope,
  appId: string,
  sessionId: string,
): Promise<{ ok: true }> {
  const app = await getConnectedApp(scope, appId);
  if (!app) throw new NotFoundError('Connected app not found.');

  const state = await harvestAuthSession(sessionId, app.baseUrl);
  // Always release the interactive session once we've tried to harvest.
  await endAuthSession(sessionId).catch(() => undefined);

  if (!state) {
    throw new BadRequestError('No login was detected — finish signing in, then try again.');
  }

  // Encrypt + persist the new session; only a reference is stored on the app (Brief §17).
  const newRef = await storeSecret(scope, JSON.stringify(state));
  const previousRef = app.credentialsRef;

  await setAppSession(scope, appId, {
    credentialsRef: newRef,
    sessionStatus: 'active',
    sessionCapturedAt: new Date(),
  });

  // Purge the superseded session secret, if any.
  if (previousRef) await deleteSecret(scope, previousRef).catch(() => undefined);

  return { ok: true };
}

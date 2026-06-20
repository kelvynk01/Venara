/**
 * auth.ts — interactive login handoff (ADR-001).
 *
 * Venara never stores a password. Instead it opens the app's OWN login page in a hosted
 * browser, embeds a Browserbase **Live View** so the user logs in themselves (incl. SSO /
 * 2FA / passkeys / CAPTCHA), then harvests the resulting authenticated session
 * (`storageState`: cookies + per-origin localStorage). That session — never the password —
 * is what gets encrypted and reused for capture.
 *
 * Recording is DISABLED for these sessions: we must never film a user typing a password.
 *
 * Browserbase access stays behind this adapter (Brief §4/§8). Env is read lazily so the
 * module import never throws.
 */
import Browserbase from '@browserbasehq/sdk';
import { chromium } from 'playwright-core';
import type { CaptureSessionState } from './index';

function getBrowserbaseApiKey(): string {
  const key = process.env['BROWSERBASE_API_KEY'];
  if (!key) throw new Error('BROWSERBASE_API_KEY is not set.');
  return key;
}

function getBrowserbaseProjectId(): string | undefined {
  return process.env['BROWSERBASE_PROJECT_ID'] ?? undefined;
}

/** Handle returned when an interactive auth session is started. */
export interface AuthHandoffSession {
  /** Browserbase session id — passed back to harvest/end the session. */
  sessionId: string;
  /** Embeddable Live View URL the dashboard renders in an iframe for the user to log in. */
  liveViewUrl: string;
  /** Unix ms when the underlying session times out (the user must finish before this). */
  expiresAt: number;
}

/**
 * How long an interactive login session may stay open before Browserbase reaps it.
 * Kept tight because these sessions count against the (small) concurrent-session quota —
 * an abandoned login must free its slot quickly. 5 minutes is plenty to sign in.
 */
const AUTH_SESSION_TIMEOUT_SECONDS = 300;

/**
 * Start an interactive login session: open a NON-recording hosted browser on the app's
 * login page and return an embeddable Live View URL. The session stays alive (keepAlive)
 * while the user authenticates; harvest it with {@link harvestAuthSession}.
 */
export async function startAuthHandoff(baseUrl: string): Promise<AuthHandoffSession> {
  const bb = new Browserbase({ apiKey: getBrowserbaseApiKey() });
  const projectId = getBrowserbaseProjectId();

  const session = await bb.sessions.create({
    ...(projectId ? { projectId } : {}),
    keepAlive: true, // stay open while the human logs in
    timeout: AUTH_SESSION_TIMEOUT_SECONDS,
    // Route through Browserbase's residential proxy so the target app sees a normal visitor.
    // Many apps silently drop data-center/bot IPs, which surfaces as ERR_TIMED_OUT ("site
    // can't be reached") in the Live View. Residential IPs avoid that.
    proxies: true,
    browserSettings: { recordSession: false }, // NEVER record the login (Brief §17, ADR-001)
  });

  // Point the browser at the app's login and WAIT for it to actually load before detaching —
  // detaching mid-navigation leaves the embedded browser on a "site can't be reached" error.
  try {
    const browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
    await browser.close(); // detach Playwright; keepAlive holds the session open
  } catch {
    // Non-fatal: the Live View still opens; the user can navigate to login themselves.
  }

  // TODO(verify with live key): confirm the SDK shape of sessions.debug() — docs show it
  // returns { debuggerFullscreenUrl, debuggerUrl, wsUrl }. debuggerFullscreenUrl is the
  // interactive (clickable) Live View used for the handoff.
  const debug = await bb.sessions.debug(session.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK return type is opaque.
  const liveViewUrl = (debug as any)?.debuggerFullscreenUrl as string | undefined;
  if (!liveViewUrl) {
    await endAuthSession(session.id).catch(() => undefined);
    throw new Error('Could not obtain a Live View URL for the login session.');
  }

  return {
    sessionId: session.id,
    liveViewUrl,
    expiresAt: Date.now() + AUTH_SESSION_TIMEOUT_SECONDS * 1000,
  };
}

/**
 * Harvest the authenticated session from a live handoff session. Returns the storageState
 * (cookies + localStorage) restricted to the app's own registrable domain, or null if no
 * meaningful session is present yet (user hasn't logged in). Never logs any values.
 */
export async function harvestAuthSession(
  sessionId: string,
  appBaseUrl: string,
): Promise<CaptureSessionState | null> {
  const bb = new Browserbase({ apiKey: getBrowserbaseApiKey() });
  const session = await bb.sessions.retrieve(sessionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- connectUrl is on the live session.
  const connectUrl = (session as any)?.connectUrl as string | undefined;
  if (!connectUrl) return null;

  const browser = await chromium.connectOverCDP(connectUrl);
  try {
    const context = browser.contexts()[0];
    if (!context) return null;
    const state = await context.storageState();
    const scoped = scopeToDomain(state as CaptureSessionState, appBaseUrl);
    // No cookies for the app's domain → the user hasn't actually logged in yet.
    return scoped.cookies.length > 0 || scoped.origins.length > 0 ? scoped : null;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** End (release) an interactive auth session. */
export async function endAuthSession(sessionId: string): Promise<void> {
  const bb = new Browserbase({ apiKey: getBrowserbaseApiKey() });
  await bb.sessions.update(sessionId, { status: 'REQUEST_RELEASE' }).catch(() => undefined);
}

/**
 * Keep only cookies/localStorage belonging to the app's registrable domain, so a login
 * handoff never persists unrelated third-party cookies the user's browser may have set.
 */
function scopeToDomain(state: CaptureSessionState, appBaseUrl: string): CaptureSessionState {
  let host: string;
  try {
    host = new URL(appBaseUrl).hostname;
  } catch {
    return state;
  }
  // Registrable-ish suffix match: keep host and its subdomains (e.g. app.fundn.ai for fundn.ai).
  const root = host.split('.').slice(-2).join('.');
  const cookieMatches = (domain: string): boolean => {
    const d = domain.replace(/^\./, '').toLowerCase();
    return d === host || d.endsWith(`.${root}`) || d === root;
  };
  return {
    cookies: state.cookies.filter((c) => cookieMatches(c.domain)),
    origins: state.origins.filter((o) => {
      try {
        return cookieMatches(new URL(o.origin).hostname);
      } catch {
        return false;
      }
    }),
  };
}

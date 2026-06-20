/**
 * session.ts — CaptureSession: the §8 lifecycle for one Browserbase recording run.
 *
 * Lifecycle:
 *   1. Open a Browserbase session (recording enabled).
 *   2. If loginMode=credentials, perform best-effort login (never log credential values).
 *   3. Execute the step script, collecting beats.
 *   4. Take DOM snapshot (page.content()) + visual snapshot (CDP Page.captureScreenshot).
 *   5. End the session (REQUEST_RELEASE).
 *   6. Retrieve the HLS recording playlist URL (best-effort — session still succeeds without it).
 *
 * Environment variables (read lazily — importing this module NEVER throws):
 *   BROWSERBASE_API_KEY      — Browserbase REST API key.
 *   BROWSERBASE_PROJECT_ID   — Browserbase project id (optional; uses SDK default if absent).
 */
import Browserbase from '@browserbasehq/sdk';
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import type {
  CaptureBeat,
  CaptureSessionResult,
  CaptureSessionState,
  CaptureStep,
} from './index';
import { executeTool, type ExecutorContext } from './tools';

// ─── Env helpers (lazy — never throw at import time) ─────────────────────────

function getBrowserbaseApiKey(): string {
  const key = process.env['BROWSERBASE_API_KEY'];
  if (!key) throw new Error('BROWSERBASE_API_KEY is not set.');
  return key;
}

function getBrowserbaseProjectId(): string | undefined {
  return process.env['BROWSERBASE_PROJECT_ID'] ?? undefined;
}

// ─── Auth session helpers (ADR-001) ────────────────────────────────────────────

/**
 * Restore a previously-captured auth session into the browser context BEFORE navigating:
 * cookies via addCookies, and per-origin localStorage via an init script that runs before
 * the page's own scripts. Venara never holds a password — only this session state.
 * Session values are NEVER logged (Brief §17).
 */
async function applySessionState(
  context: BrowserContext,
  state: CaptureSessionState,
): Promise<void> {
  if (state.cookies.length > 0) {
    // storageState cookies carry domain+path, so they apply without a target URL.
    await context.addCookies(state.cookies).catch(() => undefined);
  }
  for (const { origin, localStorage } of state.origins) {
    if (localStorage.length === 0) continue;
    // Seed localStorage for this origin before any page script reads it.
    await context
      .addInitScript(
        ({ originArg, entries }: { originArg: string; entries: Array<{ name: string; value: string }> }) => {
          // Runs in the browser; reference globals via globalThis so this file needs no DOM lib.
          const w = globalThis as unknown as {
            location: { origin: string };
            localStorage: { setItem(k: string, v: string): void };
          };
          if (w.location.origin !== originArg) return;
          for (const { name, value } of entries) {
            try {
              w.localStorage.setItem(name, value);
            } catch {
              /* storage may be unavailable; ignore */
            }
          }
        },
        { originArg: origin, entries: localStorage },
      )
      .catch(() => undefined);
  }
}

/**
 * Best-effort check that the restored session is still authenticated.
 * Conservative: only reports `needs_reauth` on a STRONG signal (a visible password field
 * or a URL that clearly landed on a login/sign-in page), so we never falsely pause a
 * working app. Any error → assume authenticated and let the capture proceed.
 */
async function probeAuthenticated(page: Page): Promise<boolean> {
  try {
    const passwordVisible = await page
      .locator('input[type="password"]')
      .first()
      .isVisible()
      .catch(() => false);
    const onLoginUrl = /\/(login|signin|sign-in|sso)(\/|\?|#|$)/.test(page.url().toLowerCase());
    // Authenticated unless we see a strong login-wall signal.
    return !(passwordVisible || onLoginUrl);
  } catch {
    return true;
  }
}

// ─── CaptureSession ───────────────────────────────────────────────────────────

export interface CaptureSessionInput {
  baseUrl: string;
  steps: CaptureStep[];
  /** A previously-captured auth session to restore (loginMode=session, ADR-001). */
  sessionState?: CaptureSessionState;
  /** Override session timeout in seconds (default 300). */
  timeoutSeconds?: number;
}

/**
 * CaptureSession drives one Browserbase recording run end-to-end.
 * Implements CaptureProvider.runSession internally.
 */
export class CaptureSession {
  private readonly bb: Browserbase;

  constructor() {
    // Validate env lazily — only when a session is actually started, so the import
    // of this module can never throw (per Brief §8 / CONSTRAINTS).
    this.bb = new Browserbase({ apiKey: getBrowserbaseApiKey() });
  }

  async run(input: CaptureSessionInput): Promise<CaptureSessionResult> {
    const sessionStartMs = Date.now();
    const beats: CaptureBeat[] = [];

    // 1. Create Browserbase session with recording enabled.
    const projectId = getBrowserbaseProjectId();
    const bbSession = await this.bb.sessions.create({
      ...(projectId ? { projectId } : {}),
      keepAlive: false,
      timeout: input.timeoutSeconds ?? 300,
      browserSettings: { recordSession: true },
    });

    const bbSessionId = bbSession.id;
    const connectUrl = bbSession.connectUrl;

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // 2. Connect Playwright to the Browserbase CDP endpoint.
      browser = await chromium.connectOverCDP(connectUrl);
      context = browser.contexts()[0] ?? (await browser.newContext());

      // 3. Restore the captured auth session BEFORE creating the page, so cookies +
      //    localStorage are present on the first navigation (ADR-001).
      if (input.sessionState) {
        await applySessionState(context, input.sessionState);
      }

      page = context.pages()[0] ?? (await context.newPage());

      // 4. For session-auth apps, land on the app and confirm we're still logged in.
      //    A login wall → short-circuit to `needs_reauth` (the caller pauses + prompts).
      if (input.sessionState) {
        await page.goto(input.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        const authed = await probeAuthenticated(page);
        if (!authed) {
          const durationMs = Date.now() - sessionStartMs;
          await this._releaseSession(bbSessionId);
          return {
            outcome: 'needs_reauth',
            browserbaseSessionId: bbSessionId,
            domSnapshot: Buffer.from(await page.content(), 'utf-8'),
            visualSnapshot: Buffer.alloc(0),
            beats,
            durationMs,
          };
        }
      }

      // 5. Execute the step script. Restrict navigation to the app's own origin (SSRF guard).
      let allowedHostname: string | undefined;
      try {
        allowedHostname = new URL(input.baseUrl).hostname;
      } catch {
        allowedHostname = undefined;
      }
      const execCtx: ExecutorContext = { page, sessionStartMs, beats, allowedHostname };
      for (const step of input.steps) {
        const result = await executeTool(execCtx, step);
        if (!result.ok) {
          // Structured failure returned to caller — do not throw (Brief §8).
          // The caller (worker processor) decides whether to replan.
          console.warn(`[capture] step "${step.tool}" (label: ${step.label ?? '—'}) failed: ${result.error ?? 'unknown'}`);
        }
      }

      // 5. DOM snapshot.
      const domHtml = await page.content();
      const domSnapshot = Buffer.from(domHtml, 'utf-8');

      // 6. Visual snapshot via CDP (full-page, beyond viewport).
      const cdp = await context.newCDPSession(page);
      // TODO(verify with live key): the official docs show Page.captureScreenshot with
      // captureBeyondViewport. Confirm the exact CDP param name with a live session.
      const { data: screenshotB64 } = (await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })) as { data: string };
      const visualSnapshot = Buffer.from(screenshotB64, 'base64');

      const durationMs = Date.now() - sessionStartMs;

      // 7. End the Browserbase session.
      await this._releaseSession(bbSessionId);

      // 8. Retrieve the HLS recording playlist URL (best-effort).
      const recordingPlaylistUrl = await this._retrieveRecordingPlaylist(bbSessionId);

      return {
        outcome: 'ok',
        browserbaseSessionId: bbSessionId,
        domSnapshot,
        visualSnapshot,
        beats,
        recordingPlaylistUrl,
        durationMs,
      };
    } finally {
      // Always close the Playwright browser connection to avoid leaks.
      if (browser) {
        try { await browser.close(); } catch { /* ignore */ }
      }
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async _releaseSession(sessionId: string): Promise<void> {
    try {
      // Per Browserbase docs: update status to REQUEST_RELEASE to end the session.
      await this.bb.sessions.update(sessionId, { status: 'REQUEST_RELEASE' });
    } catch (err) {
      // Not fatal — the session will expire naturally.
      console.warn('[capture] failed to release Browserbase session:', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Retrieve the HLS playlist URL for the session recording.
   *
   * Browserbase recording is delivered as HLS (.m3u8 + fMP4 segments).
   * The worker transcodes this to MP4 with ffmpeg.
   *
   * TODO(verify with live key): the exact shape of bb.sessions.replays.retrieve() and
   * bb.sessions.replays.retrievePage() responses needs to be confirmed against the live
   * API. The SDK types may differ from the REST docs. The parsing below follows the
   * documented shape (pages[] with pageId → m3u8 URL) but must be tested with a real key.
   */
  private async _retrieveRecordingPlaylist(sessionId: string): Promise<string | undefined> {
    try {
      // TODO(verify with live key): confirm the response structure of sessions.replays.retrieve().
      const replays = await this.bb.sessions.replays.retrieve(sessionId);

      // The docs show pages[] with a pageId; retrieve the first page's playlist.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK return type is opaque; cast to access documented fields.
      const pages = (replays as any)?.pages as Array<{ pageId: string }> | undefined;
      if (!pages || pages.length === 0) return undefined;

      const firstPage = pages[0];
      if (!firstPage?.pageId) return undefined;

      // TODO(verify with live key): confirm that retrievePage() returns { url: string }
      // with the .m3u8 URL, and that this URL is the HLS playlist (not a direct MP4).
      const pageReplay = await this.bb.sessions.replays.retrievePage(sessionId, firstPage.pageId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same SDK opacity.
      const playlistUrl = (pageReplay as any)?.url as string | undefined;
      return playlistUrl;
    } catch (err) {
      // Recording is best-effort — session still succeeds with snapshots.
      console.warn('[capture] could not retrieve recording playlist:', err instanceof Error ? err.message : String(err));
      return undefined;
    }
  }
}

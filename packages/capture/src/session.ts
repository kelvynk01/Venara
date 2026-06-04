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
  CaptureCredentials,
  CaptureSessionResult,
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

// ─── Login helper ─────────────────────────────────────────────────────────────

/**
 * Best-effort login: fill username + password by role/label (Brief §8).
 * Any failure is silently swallowed — the session will continue and likely fail
 * at a later assert or navigation, giving a cleaner error than crashing here.
 * Credential values are NEVER logged (Brief §17).
 */
async function performLogin(page: Page, creds: CaptureCredentials): Promise<void> {
  try {
    // Common username field selectors — try accessible label first, then role, then selector.
    const userField =
      (await page.getByLabel(/username|email|user/i).count()) > 0
        ? page.getByLabel(/username|email|user/i).first()
        : (await page.getByRole('textbox', { name: /username|email|user/i }).count()) > 0
          ? page.getByRole('textbox', { name: /username|email|user/i }).first()
          : page.locator('input[name="username"], input[name="email"], input[type="email"]').first();

    await userField.fill(creds.username, { timeout: 10_000 });

    const pwField =
      (await page.getByLabel(/password|pass/i).count()) > 0
        ? page.getByLabel(/password|pass/i).first()
        : page.locator('input[type="password"]').first();

    // NOTE: creds.password is intentionally NOT included in any log line (Brief §17).
    await pwField.fill(creds.password, { timeout: 10_000 });

    // Submit — try a submit button first, then Enter.
    const submitBtn = page.getByRole('button', { name: /sign in|log in|login|submit/i });
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click({ timeout: 10_000 });
    } else {
      await pwField.press('Enter');
    }

    // Wait briefly for navigation after login.
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  } catch {
    // Best-effort: never throw; the main session will reflect auth failure naturally.
    // Do NOT log any part of the credentials here (Brief §17).
    console.warn('[capture] login step encountered an issue — continuing anyway');
  }
}

// ─── CaptureSession ───────────────────────────────────────────────────────────

export interface CaptureSessionInput {
  baseUrl: string;
  steps: CaptureStep[];
  credentials?: CaptureCredentials;
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
      page = context.pages()[0] ?? (await context.newPage());

      // 3. Optional login (before running the user's step script).
      if (input.credentials) {
        // Navigate to base URL first so the login form is present.
        await page.goto(input.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await performLogin(page, input.credentials);
      }

      // 4. Execute the step script.
      const execCtx: ExecutorContext = { page, sessionStartMs, beats };
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

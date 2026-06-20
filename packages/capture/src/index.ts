/**
 * @venara/capture — drives a third-party app in a real browser and records a clean take
 * (Brief §8). Browserbase by default, behind a capture-provider adapter.
 *
 * The capture tool set below is the ONLY verb vocabulary the agent may emit (Brief §8).
 * Targets resolve by accessible role/label first, visible text second, CSS selector last,
 * so captures survive cosmetic UI changes.
 */
import type { CaptureToolName } from '@venara/shared';

export type { CaptureToolName };

// ─── Step argument shapes ────────────────────────────────────────────────────

export interface NavigateArgs {
  url: string;
  /** Optional timeout override in milliseconds. */
  timeout?: number;
}

export interface ClickArgs {
  /** Accessible role label, visible text, or CSS selector (resolved in that order). */
  target: string;
  timeout?: number;
}

export interface TypeArgs {
  /** Target field — resolved by role/label, text, or selector. */
  target: string;
  /** The text to type. NEVER logged — callers must redact if this holds credentials. */
  text: string;
  timeout?: number;
}

export interface PressArgs {
  /** A Playwright key string, e.g. "Enter", "Tab", "Escape". */
  key: string;
}

export interface ScrollArgs {
  direction: 'up' | 'down' | 'left' | 'right';
  /** Distance in CSS pixels. */
  amount?: number;
}

export interface WaitArgs {
  /** Either a CSS selector/text condition string, or a number of milliseconds. */
  condition: string | number;
  timeout?: number;
}

export interface HoverArgs {
  target: string;
  timeout?: number;
}

/** No extra args — takes a full-page screenshot and emits it as a beat artifact. */
export type ScreenshotArgs = Record<never, never>;

export interface AssertArgs {
  /** A CSS selector or visible-text condition that must be true to continue. */
  condition: string;
  timeout?: number;
}

export interface MarkBeatArgs {
  label: string;
}

/** Union of per-tool argument shapes, keyed by tool name. */
export type CaptureStepArgs = {
  navigate: NavigateArgs;
  click: ClickArgs;
  type: TypeArgs;
  press: PressArgs;
  scroll: ScrollArgs;
  wait: WaitArgs;
  hover: HoverArgs;
  screenshot: ScreenshotArgs;
  assert: AssertArgs;
  markBeat: MarkBeatArgs;
};

// ─── Step + result types ─────────────────────────────────────────────────────

/** A single capture instruction — one verb from the Brief §8 tool set. */
export interface CaptureStep {
  tool: CaptureToolName;
  /** Verb-specific argument(s); shape validated per-tool by the executor. */
  args?: CaptureStepArgs[CaptureToolName];
  /** Optional human label for progress UI / beat callouts. */
  label?: string;
}

/** A beat recorded by `markBeat`, relative to capture start. */
export interface CaptureBeat {
  label: string;
  /** Milliseconds since the capture session started. */
  atMs: number;
}

/** Structured result of running one step; failures let the agent replan once (Brief §8). */
export interface CaptureStepResult {
  ok: boolean;
  /** Only present when ok === false. */
  error?: string;
  /** Milliseconds the step took. */
  durationMs?: number;
}

// ─── Session result ───────────────────────────────────────────────────────────

/**
 * Outcome of a capture run (ADR-001):
 *  - `ok`         — the session was authenticated (or none was needed) and steps ran.
 *  - `needs_reauth` — the stored auth session was missing/expired; steps were NOT run.
 *    The caller pauses recaptures for this app and prompts the user to reconnect.
 */
export type CaptureOutcome = 'ok' | 'needs_reauth';

/** Full result of a completed capture session (Brief §8). */
export interface CaptureSessionResult {
  /** Whether the run produced a usable take or needs the user to re-authenticate. */
  outcome: CaptureOutcome;
  browserbaseSessionId: string;
  /** Raw HTML of the final page state — used as the DOM snapshot for staleness diffing. */
  domSnapshot: Buffer;
  /** Full-page screenshot as PNG bytes — the visual snapshot. */
  visualSnapshot: Buffer;
  /** Beats recorded via `markBeat` steps, sorted by time. */
  beats: CaptureBeat[];
  /** HLS playlist URL for the Browserbase recording (valid ~6 h). Best-effort: may be undefined. */
  recordingPlaylistUrl?: string;
  /** Wall-clock duration of the recording session in milliseconds. */
  durationMs: number;
}

// ─── Auth session (ADR-001) ───────────────────────────────────────────────────

/**
 * A captured, authenticated browser session — Playwright `storageState` shape.
 * This is what Venara stores (encrypted) instead of a password: cookies + per-origin
 * localStorage harvested during the interactive login handoff. NEVER logged.
 */
export interface CaptureSessionState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

// ─── Provider contract ────────────────────────────────────────────────────────

/** Capture-provider contract; the Browserbase adapter implements this (Brief §4/§8). */
export interface CaptureProvider {
  /** Open a session against a base URL, optionally restoring an auth session, and record a take. */
  runSession(input: {
    baseUrl: string;
    steps: CaptureStep[];
    sessionState?: CaptureSessionState;
  }): Promise<CaptureSessionResult>;
}

// ─── Re-export the session implementation ────────────────────────────────────

export { CaptureSession } from './session';
export { executeTool } from './tools';

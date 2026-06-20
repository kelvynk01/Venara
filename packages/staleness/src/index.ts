/**
 * @venara/staleness — the moat: keep every video correct as the app changes, and
 * regenerate only what's affected (Brief §11).
 *
 * Pipeline: baseline snapshot → re-snapshot (schedule or deploy webhook) → diff
 * (structural DOM + perceptual visual-hash + Claude-vision meaningful-change check) →
 * resolve affected videos → notify + (optionally auto-) regenerate.
 *
 * Precision over recall (Brief §11): a false "stale" wastes money and erodes trust —
 * tune the meaningful-change classifier conservatively and log every decision.
 *
 * Phase 1: contract only. Implementation lands in Phase 6 (the staleness engine).
 */

/** Outcome of comparing a fresh UiSnapshot to its baseline (Brief §11). */
export interface DiffResult {
  /** True only when the change is meaningful (layout/label/flow), not cosmetic noise. */
  meaningful: boolean;
  /** Routes whose structure or visuals changed. */
  changedRoutes: string[];
  /** Human-readable summary for the "what changed" UI. */
  summary: string;
}

/**
 * ADR-001 — session-auth guard for the recapture scheduler (to honor when this engine is
 * built in Phase 6):
 *
 *   Before scheduling an automated re-snapshot/recapture for a ConnectedApp, SKIP any app
 *   with `loginMode === 'session' && sessionStatus !== 'active'`. An expired session can't
 *   authenticate unattended; scheduling would only burn a Browserbase session against a
 *   login wall. The user is already prompted to reconnect on the app page; recaptures
 *   resume automatically once `sessionStatus` returns to `active`.
 *
 * Runtime safety net (already live): if a session expires mid-run, CaptureSession returns
 * `outcome: 'needs_reauth'`, and the capture/agent workers set `sessionStatus = 'expired'`
 * and pause rather than fail-retrying. See apps/worker/src/processors/capture.ts.
 */
export function isRecaptureEligible(app: {
  loginMode: 'none' | 'session';
  sessionStatus?: 'active' | 'expired' | null;
}): boolean {
  return app.loginMode !== 'session' || app.sessionStatus === 'active';
}

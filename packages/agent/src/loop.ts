/**
 * loop.ts — CAPTURE → SCRIPT phases of the agent loop (Brief §9).
 *
 * executePhase takes a validated plan + resolved credentials, runs a CaptureSession
 * within the wall-clock budget, then calls writeNarration on the resulting beats.
 * Enforces:
 *   - AGENT_LIMITS.wallClockBudgetMs: if exceeded, surface a partial explanation.
 *   - AGENT_LIMITS.maxSteps: plans exceeding this were rejected in planPhase; a
 *     defensive re-check here guards against callers bypassing planPhase.
 *
 * Security: credentials are passed in from the worker which decrypts them; values
 * are NEVER logged here (Brief §17).
 */
import { CaptureSession } from '@venara/capture';
import type { CaptureSessionResult, CaptureSessionState } from '@venara/capture';
import { getLlm, type AgentIntentOutput, type AgentPlanOutput, type NarrationOutput } from '@venara/llm';
import { AGENT_LIMITS } from '@venara/shared';
import type { AgentProgressStep } from '@venara/shared';

// ─── Progress helper ──────────────────────────────────────────────────────────

/**
 * Build a typed AgentProgressStep list from a set of phase labels.
 * The active index advances as the run progresses.
 */
export function buildProgressSteps(
  labels: string[],
  activeIndex: number,
): AgentProgressStep[] {
  return labels.map((label, i) => ({
    label,
    state: i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending',
  }));
}

/** Standard phase labels for a full agent run (Brief §9). */
export const AGENT_PHASE_LABELS = [
  'Parsing intent',
  'Planning steps',
  'Capturing app',
  'Writing narration',
  'Rendering video',
] as const;

// ─── ExecutePhase inputs / outputs ────────────────────────────────────────────

export interface ExecutePhaseInput {
  /** The validated plan from planPhase. */
  plan: AgentPlanOutput;
  /** Resolved intent (for lexicon / narration context). */
  intent: AgentIntentOutput;
  /** App base URL (from ConnectedApp.baseUrl). */
  baseUrl: string;
  /** Restored auth session for loginMode=session apps — NEVER log this (Brief §17, ADR-001). */
  sessionState?: CaptureSessionState;
  /** App pronunciation lexicon for narration (safe to pass to LLM). */
  lexicon?: import('@venara/llm').LexiconEntry[];
}

export interface ExecutePhaseOutput {
  captureResult: CaptureSessionResult;
  narration: NarrationOutput;
}

// ─── executePhase ─────────────────────────────────────────────────────────────

/**
 * Run the CAPTURE → SCRIPT phases of the agent loop (Brief §9).
 *
 * Enforces AGENT_LIMITS.wallClockBudgetMs: times out the capture session + narration
 * as a combined wall-clock budget. On exceeded budget, throws with a partial explanation.
 *
 * Defensive step-count guard: rejects plans exceeding maxSteps even if planPhase
 * was bypassed (belt-and-suspenders, Brief §9).
 */
export async function executePhase(input: ExecutePhaseInput): Promise<ExecutePhaseOutput> {
  const { plan, baseUrl, sessionState, lexicon = [] } = input;

  // Defensive step-cap check (primary enforcement is in planPhase/planSteps schema).
  if (plan.steps.length > AGENT_LIMITS.maxSteps) {
    throw new Error(
      `Plan exceeds maxSteps (${plan.steps.length} > ${AGENT_LIMITS.maxSteps}). Aborting.`,
    );
  }

  const budgetDeadline = Date.now() + AGENT_LIMITS.wallClockBudgetMs;

  // ── CAPTURE ──────────────────────────────────────────────────────────────────
  // CaptureSession reads BROWSERBASE_API_KEY lazily — validated at session creation,
  // not at import time (Brief §8). No credential values are logged here (Brief §17).
  const session = new CaptureSession();

  const capturePromise = session.run({
    baseUrl,
    steps: plan.steps,
    sessionState,
    // Convert the wall-clock budget remainder to seconds for the Browserbase timeout.
    timeoutSeconds: Math.max(
      30,
      Math.floor((budgetDeadline - Date.now()) / 1000),
    ),
  });

  // Race the capture against the wall-clock budget. The timer is cleared once the race
  // settles so it doesn't keep the event loop (or a test process) alive after capture wins.
  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  const captureResult = await Promise.race([
    capturePromise,
    new Promise<never>((_, reject) => {
      const remaining = budgetDeadline - Date.now();
      budgetTimer = setTimeout(() => {
        reject(
          new Error(
            `Agent wall-clock budget exceeded (${AGENT_LIMITS.wallClockBudgetMs / 1000}s). ` +
              'The capture session was still running when the budget expired. ' +
              'Try a simpler prompt or fewer steps.',
          ),
        );
      }, Math.max(0, remaining));
    }),
  ]).finally(() => {
    if (budgetTimer) clearTimeout(budgetTimer);
  });

  // ── SCRIPT ───────────────────────────────────────────────────────────────────
  // Check budget before starting narration.
  if (Date.now() >= budgetDeadline) {
    throw new Error(
      `Agent wall-clock budget exceeded after capture (${AGENT_LIMITS.wallClockBudgetMs / 1000}s). ` +
        'Capture succeeded but narration could not be written.',
    );
  }

  const llm = getLlm();
  const narration = await llm.writeNarration(captureResult.beats, lexicon);

  return { captureResult, narration };
}

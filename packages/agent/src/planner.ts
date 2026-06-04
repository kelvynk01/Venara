/**
 * planner.ts — PARSE → RESOLVE → PLAN → CONFIRM-detection (Brief §9).
 *
 * Takes a raw user prompt + an app base URL, calls the LLM twice at most
 * (plan + one replan on validation failure), validates that every step in the
 * returned plan uses ONLY the §8 tool verbs, and performs a safety scan for
 * risky/irreversible intent patterns to set the CONFIRM gate.
 *
 * Security: base URL is config (not secret) — safe to pass to the planner context.
 * NEVER pass credential values into the LLM context (Brief §17).
 */
import { getLlm, type AgentIntentOutput, type AgentPlanOutput } from '@venara/llm';
import type { CaptureStep } from '@venara/capture';
import { AGENT_LIMITS } from '@venara/shared';

// ─── Allowed tool verbs (Brief §8) ───────────────────────────────────────────

const ALLOWED_TOOLS = new Set([
  'navigate',
  'click',
  'type',
  'press',
  'scroll',
  'wait',
  'hover',
  'screenshot',
  'assert',
  'markBeat',
] as const);

// ─── Risky-step safety scanner ────────────────────────────────────────────────

/**
 * Pattern that, when found in a step's `target`, `text`, or `key` field, flags the
 * step as irreversible or write-significant, triggering the CONFIRM gate (Brief §9).
 */
const RISKY_PATTERN =
  /delete|remove|pay|purchase|buy|send|charge|invite.*real|confirm/i;

function isSafetyRisky(step: CaptureStep): boolean {
  if (
    step.tool !== 'type' &&
    step.tool !== 'click' &&
    step.tool !== 'press' &&
    step.tool !== 'navigate'
  ) {
    return false;
  }

  if (step.tool === 'navigate') {
    // A GET to a confirmation/charge/unsubscribe URL can itself be irreversible — gate it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- args shape varies per tool
    const args = step.args as Record<string, unknown> | undefined;
    const url = typeof args?.['url'] === 'string' ? args['url'] : '';
    return RISKY_PATTERN.test(url);
  }

  if (step.tool === 'type') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- args shape varies per tool; cast is safe here
    const args = step.args as Record<string, unknown> | undefined;
    const target = typeof args?.['target'] === 'string' ? args['target'] : '';
    const text = typeof args?.['text'] === 'string' ? args['text'] : '';
    return RISKY_PATTERN.test(target) || RISKY_PATTERN.test(text);
  }

  if (step.tool === 'click') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- args shape varies per tool
    const args = step.args as Record<string, unknown> | undefined;
    const target = typeof args?.['target'] === 'string' ? args['target'] : '';
    return RISKY_PATTERN.test(target);
  }

  if (step.tool === 'press') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- args shape varies per tool
    const args = step.args as Record<string, unknown> | undefined;
    const key = typeof args?.['key'] === 'string' ? args['key'] : '';
    return RISKY_PATTERN.test(key);
  }

  return false;
}

/**
 * Return true if any step in the plan touches a risky / irreversible action.
 * Combined with the planner's own `needsConfirmation` flag this drives the CONFIRM gate.
 */
function hasSafetyRiskyStep(steps: CaptureStep[]): boolean {
  return steps.some(isSafetyRisky);
}

// ─── Plan validation ──────────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean;
  /** The first invalid tool name found, if any. */
  invalidTool?: string;
}

/**
 * Validate that every step uses one of the §8 allowed tool verbs and that the total
 * step count is within AGENT_LIMITS.maxSteps.
 */
function validatePlan(plan: AgentPlanOutput): ValidationResult {
  if (plan.steps.length > AGENT_LIMITS.maxSteps) {
    return {
      ok: false,
      invalidTool: `plan exceeds maxSteps (${plan.steps.length} > ${AGENT_LIMITS.maxSteps})`,
    };
  }
  for (const step of plan.steps) {
    if (!ALLOWED_TOOLS.has(step.tool as (typeof ALLOWED_TOOLS extends Set<infer T> ? T : never))) {
      return { ok: false, invalidTool: step.tool };
    }
  }
  return { ok: true };
}

// ─── PlanPhase inputs/outputs ─────────────────────────────────────────────────

export interface PlanPhaseInput {
  prompt: string;
  baseUrl: string;
}

export interface PlanPhaseOutput {
  intent: AgentIntentOutput;
  plan: AgentPlanOutput;
  needsConfirmation: boolean;
  confirmationQuestion?: string;
}

// ─── planPhase ────────────────────────────────────────────────────────────────

/**
 * Run the PARSE → RESOLVE → PLAN phases of the agent loop (Brief §9).
 *
 * 1. PARSE: parseIntent(prompt) → AgentIntentOutput.
 * 2. RESOLVE: pass { baseUrl } as AppContext (bounded route-map discovery is deferred).
 * 3. PLAN: planSteps(intent, appContext) → AgentPlanOutput.
 * 4. Validate: ensure all step verbs are in the §8 set and within maxSteps.
 *    On failure: one replan with an explicit instruction to fix the offending verbs,
 *    then throw if still invalid (maxReplans = 1 — Brief §9).
 * 5. CONFIRM detection: LLM `needsConfirmation` OR safety scan of steps.
 *
 * Throws if the LLM fails twice or if the plan is invalid after the single replan.
 */
export async function planPhase(input: PlanPhaseInput): Promise<PlanPhaseOutput> {
  const llm = getLlm();

  // ── PARSE ────────────────────────────────────────────────────────────────────
  const intent = await llm.parseIntent(input.prompt);

  // ── RESOLVE (Phase 4: pass baseUrl; bounded discovery is deferred) ───────────
  const appContext = { baseUrl: input.baseUrl };

  // ── PLAN ─────────────────────────────────────────────────────────────────────
  let plan = await llm.planSteps(intent, appContext);

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validation = validatePlan(plan);
  if (!validation.ok) {
    // One replan — enrich the intent with a correction note and try again.
    // We modify a local copy of the intent; the original intent is returned unchanged
    // so the caller can log what was actually parsed.
    // Strip bracket/newline separators from the (user-derived) goal so it can't break out
    // of the correction note and inject instructions. Zod validation is still the last line
    // of defence, but this closes the injection surface (defense in depth).
    const safeGoal = intent.goal.replace(/[[\]\r\n]/g, ' ').slice(0, 500);
    const correctedIntent: AgentIntentOutput = {
      ...intent,
      // Append correction note to the goal so planSteps re-generates without the bad verb.
      goal: `${safeGoal} [CORRECTION: previous plan contained invalid or over-limit step "${String(validation.invalidTool)}". Re-plan using ONLY the 10 allowed verbs: navigate, click, type, press, scroll, wait, hover, screenshot, assert, markBeat. Strict limit: ${AGENT_LIMITS.maxSteps} steps max.]`,
    };

    plan = await llm.planSteps(correctedIntent, appContext);

    // Second validation — if still invalid, fail hard (maxReplans = 1).
    const secondValidation = validatePlan(plan);
    if (!secondValidation.ok) {
      throw new Error(
        `Agent plan invalid after replan (maxReplans=${AGENT_LIMITS.maxReplans}). ` +
          `Offending step/limit: "${String(secondValidation.invalidTool)}". Aborting.`,
      );
    }
  }

  // ── CONFIRM detection ────────────────────────────────────────────────────────
  const safetyRisky = hasSafetyRiskyStep(plan.steps);
  const needsConfirmation = plan.needsConfirmation || intent.needsConfirmation || safetyRisky;

  const confirmationQuestion =
    needsConfirmation
      ? (plan.confirmationQuestion ??
        'This action includes a step that may be irreversible or affect real data. Do you want to proceed?')
      : undefined;

  return { intent, plan, needsConfirmation, confirmationQuestion };
}

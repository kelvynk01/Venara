/**
 * @venara/agent — the conversational create agent: the primary create path (Brief §9).
 *
 * A bounded tool-use loop: PARSE → RESOLVE → PLAN → CONFIRM → CAPTURE → SCRIPT → RENDER →
 * RETURN. It emits ONLY the capture tool set (Brief §8). Planner output is validated against
 * a Zod schema before execution; invalid → one replan → fail. Hard step cap + wall-clock
 * budget per run (see AGENT_LIMITS) — never loop forever. Any write/payment/irreversible
 * action hits the CONFIRM gate before capture runs.
 */
export type { AgentIntent } from '@venara/shared';
export { AGENT_LIMITS } from '@venara/shared';

/** A planned, validated step script ready for the capture session (Brief §9). */
export interface AgentPlan {
  steps: import('@venara/capture').CaptureStep[];
  /** Set when the plan touches risky actions and needs in-product confirmation (Brief §9). */
  needsConfirmation: boolean;
  confirmationQuestion?: string;
}

// ─── Phase functions ──────────────────────────────────────────────────────────

export { planPhase } from './planner.js';
export type { PlanPhaseInput, PlanPhaseOutput } from './planner.js';

export { executePhase, buildProgressSteps, AGENT_PHASE_LABELS } from './loop.js';
export type { ExecutePhaseInput, ExecutePhaseOutput } from './loop.js';

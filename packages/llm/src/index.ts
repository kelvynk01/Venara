/**
 * @venara/llm — Anthropic (Claude) client + prompt builders + vision helpers (Brief §4/§14).
 *
 * Model-per-job (Brief §14): never swap a model without asking. ALL prompts live as
 * builder functions in `prompts.ts` — never inline string prompts in services.
 * Structured outputs demand JSON only; parse safely; one retry then fail.
 *
 * Phase 1: contract + model registry only. The Anthropic client lands in the agent phase.
 */

/** Model-per-job registry (Brief §14). The string ids are filled in per job in its phase. */
export const MODELS = {
  /** Parse request → intent: cheap, structured extraction. */
  parseIntent: 'claude-haiku-4-5',
  /** Plan capture step script: reasoning over route map + tool set. */
  planCapture: 'claude-sonnet-4-6',
  /** Vision: locate feature / judge UI change. */
  vision: 'claude-sonnet-4-6',
  /** Narration / marketing copy: quality-sensitive, brand-voiced. */
  copy: 'claude-sonnet-4-6',
} as const;

export type LlmJob = keyof typeof MODELS;

/** Minimal client contract; the Anthropic adapter implements this (Brief §4). */
export interface LlmProvider {
  /** Single-shot JSON completion for a given job; output validated by the caller's Zod schema. */
  completeJson(job: LlmJob, system: string, user: string): Promise<unknown>;
}

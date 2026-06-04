/**
 * @venara/llm — Anthropic (Claude) client + prompt builders for the conversational
 * create agent (Brief §4/§14).
 *
 * Model-per-job (Brief §14): never swap a model without a deliberate change here.
 * ALL prompts live as builder functions in `prompts.ts` — never inline string prompts
 * in services.  Structured outputs use messages.parse + zodOutputFormat; one retry
 * then fail.
 *
 * Public surface:
 *   MODELS, LlmJob, LlmProvider  — model registry + minimal provider contract.
 *   getLlm()                     — returns high-level methods the agent calls.
 *   LlmOutputError               — thrown on second failure (re-exported for callers).
 */

// ─── Model registry ───────────────────────────────────────────────────────────

/**
 * Model-per-job registry (Brief §14).
 * String ids are exact — no date suffixes, no aliases.
 */
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

/** Minimal client contract; the Anthropic adapter in client.ts implements this. */
export interface LlmProvider {
  /** Single-shot JSON completion for a given job; output validated by the caller's Zod schema. */
  completeJson(job: LlmJob, system: string, user: string): Promise<unknown>;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { LlmOutputError } from './client.js';
export type {
  AgentIntentOutput,
  AgentPlanOutput,
  NarrationOutput,
  MarketingCopyOutput,
  CaptureStepOutput,
} from './schemas.js';
export type { PromptPair, LexiconEntry, AppContext } from './prompts.js';

// ─── High-level facade ────────────────────────────────────────────────────────

import { completeStructured } from './client.js';
import {
  parseIntentPrompt,
  planStepsPrompt,
  narrationPrompt,
  marketingCopyPrompt,
} from './prompts.js';
import {
  agentIntentSchema,
  agentPlanSchema,
  narrationSchema,
  marketingCopySchema,
  type AgentIntentOutput,
  type AgentPlanOutput,
  type NarrationOutput,
  type MarketingCopyOutput,
} from './schemas.js';
import type { LexiconEntry, AppContext } from './prompts.js';
import type { CaptureBeat } from '@venara/capture';

/**
 * The Llm facade — high-level methods the agent calls.
 * Obtain via `getLlm()` (singleton pattern; safe to call repeatedly).
 */
export interface Llm {
  /**
   * Parse a raw user prompt into a structured AgentIntent.
   * Uses claude-haiku-4-5 (cheap, structured extraction).
   */
  parseIntent(userPrompt: string): Promise<AgentIntentOutput>;

  /**
   * Produce an ordered capture-step script for a given intent + app context.
   * Uses claude-sonnet-4-6 (planning + tool-set reasoning).
   */
  planSteps(intent: AgentIntentOutput, appContext: AppContext): Promise<AgentPlanOutput>;

  /**
   * Write timed how-to narration aligned to capture beats.
   * Uses claude-sonnet-4-6 with the pronunciation lexicon applied.
   */
  writeNarration(beats: CaptureBeat[], lexicon: LexiconEntry[]): Promise<NarrationOutput>;

  /**
   * Write marketing hook + body lines + CTA copy for a demo video.
   * Uses claude-sonnet-4-6 with the pronunciation lexicon applied.
   */
  writeMarketingCopy(
    intent: AgentIntentOutput,
    beats: CaptureBeat[],
    lexicon: LexiconEntry[],
  ): Promise<MarketingCopyOutput>;
}

/** Singleton facade instance (created on first getLlm() call). */
let _llm: Llm | undefined;

/**
 * Return the shared Llm facade, creating it on first call.
 * Safe to call at module load time — the underlying Anthropic client is only
 * instantiated when a method is first invoked (Brief §14: lazy env).
 */
export function getLlm(): Llm {
  if (!_llm) {
    _llm = {
      async parseIntent(userPrompt: string): Promise<AgentIntentOutput> {
        const { system, user } = parseIntentPrompt(userPrompt);
        return completeStructured('parseIntent', system, user, agentIntentSchema);
      },

      async planSteps(intent: AgentIntentOutput, appContext: AppContext): Promise<AgentPlanOutput> {
        const { system, user } = planStepsPrompt(intent, appContext);
        return completeStructured('planCapture', system, user, agentPlanSchema);
      },

      async writeNarration(
        beats: CaptureBeat[],
        lexicon: LexiconEntry[],
      ): Promise<NarrationOutput> {
        const { system, user } = narrationPrompt(beats, lexicon);
        return completeStructured('copy', system, user, narrationSchema);
      },

      async writeMarketingCopy(
        intent: AgentIntentOutput,
        beats: CaptureBeat[],
        lexicon: LexiconEntry[],
      ): Promise<MarketingCopyOutput> {
        const { system, user } = marketingCopyPrompt(intent, beats, lexicon);
        return completeStructured('copy', system, user, marketingCopySchema);
      },
    };
  }
  return _llm;
}

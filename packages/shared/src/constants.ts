/**
 * constants.ts — cross-cutting constants shared by apps and packages.
 */

/** API version prefix — every route lives under this (Brief §12). */
export const API_VERSION = 'v1' as const;
export const API_PREFIX = `/${API_VERSION}` as const;

/**
 * BullMQ queue names (Brief §13). The single registry of queue identifiers so the
 * API (producer) and worker (consumer) never drift on a string.
 */
export const QUEUE_NAMES = {
  discover: 'discover',
  agent: 'agent',
  capture: 'capture',
  render: 'render',
  snapshot: 'snapshot',
  diff: 'diff',
  digest: 'digest',
  /** Phase 1 only: proves the BullMQ → Bull Board path end to end. */
  noop: 'noop',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Status-poll cadence the frontend uses for long operations (Brief §12/§16). */
export const STATUS_POLL_INTERVAL_MS = 4000;

/**
 * Plan identifiers. Limits are enforced via UsageEvent + plan limits (Brief §18);
 * the concrete numbers land in Phase 7 — this is just the id vocabulary.
 */
export const PLAN_IDS = {
  free: 'free',
  pro: 'pro',
} as const;

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS];

/** Bounds for the agent tool-use loop (Brief §9) — never loop forever. */
export const AGENT_LIMITS = {
  maxSteps: 40,
  wallClockBudgetMs: 5 * 60 * 1000,
  maxReplans: 1,
} as const;

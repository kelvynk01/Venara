/**
 * @venara/capture — drives a third-party app in a real browser and records a clean take
 * (Brief §8). Browserbase by default, behind a capture-provider adapter.
 *
 * The capture tool set below is the ONLY verb vocabulary the agent may emit (Brief §8).
 * Targets resolve by accessible role/label first, visible text second, CSS selector last,
 * so captures survive cosmetic UI changes.
 *
 * Phase 1: tool-set types + session contract. The Browserbase adapter + recorder land in
 * Phase 2 (Connect + capture core).
 */
import type { CaptureToolName } from '@venara/shared';

/** A single capture instruction — one verb from the Brief §8 tool set. */
export interface CaptureStep {
  tool: CaptureToolName;
  /** Verb-specific argument(s); shape validated per-tool in Phase 2. */
  args?: Record<string, unknown>;
  /** Optional human label for progress UI / beat callouts. */
  label?: string;
}

/** Structured result of running one step; failures let the agent replan once (Brief §8). */
export interface CaptureStepResult {
  ok: boolean;
  error?: string;
}

/** Capture-provider contract; the Browserbase adapter implements this (Brief §4/§8). */
export interface CaptureProvider {
  /** Open a session against a base URL, optionally authenticating, and record a take. */
  runSession(input: {
    baseUrl: string;
    steps: CaptureStep[];
  }): Promise<{ browserbaseSessionId: string }>;
}

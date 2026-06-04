/**
 * schemas.ts — Zod schemas for every structured LLM output in @venara/llm.
 *
 * These mirror the domain types in @venara/shared and @venara/capture but are
 * defined here so that `messages.parse` / `zodOutputFormat` has the complete
 * shape locally, with no circular dependency back to the API layer.
 *
 * Brief §14: structured JSON only — never ask the model to return free text when
 * a schema is expected.
 */
import { z } from 'zod';

// ─── Shared leaf schemas ──────────────────────────────────────────────────────

export const renderAspectSchema = z.enum(['16:9', '9:16', '1:1']);

export const videoTypeSchema = z.enum(['howto', 'marketing']);

/**
 * The ONLY verbs the agent may emit (Brief §8 / shared CaptureToolName).
 * Restricting here ensures the model cannot hallucinate an unlisted verb.
 */
export const captureToolNameSchema = z.enum([
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
]);

// ─── Per-tool argument schemas ────────────────────────────────────────────────
// These mirror the CaptureStepArgs shapes in @venara/capture exactly.

const navigateArgsSchema = z.object({
  url: z.string().url(),
  timeout: z.number().positive().optional(),
});

const clickArgsSchema = z.object({
  target: z.string().min(1),
  timeout: z.number().positive().optional(),
});

const typeArgsSchema = z.object({
  target: z.string().min(1),
  text: z.string(),
  timeout: z.number().positive().optional(),
});

const pressArgsSchema = z.object({
  key: z.string().min(1),
});

const scrollArgsSchema = z.object({
  direction: z.enum(['up', 'down', 'left', 'right']),
  amount: z.number().positive().optional(),
});

const waitArgsSchema = z.object({
  condition: z.union([z.string().min(1), z.number().positive()]),
  timeout: z.number().positive().optional(),
});

const hoverArgsSchema = z.object({
  target: z.string().min(1),
  timeout: z.number().positive().optional(),
});

const screenshotArgsSchema = z.object({}).strict();

const assertArgsSchema = z.object({
  condition: z.string().min(1),
  timeout: z.number().positive().optional(),
});

const markBeatArgsSchema = z.object({
  label: z.string().min(1),
});

// ─── CaptureStep schema ───────────────────────────────────────────────────────

/**
 * A single capture step that the planner may emit.  The `args` union is
 * discriminated by `tool` so the model gets tight per-tool argument guidance
 * (and the validator rejects any unlisted verb at runtime).
 */
export const captureStepSchema = z.discriminatedUnion('tool', [
  z.object({ tool: z.literal('navigate'), args: navigateArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('click'), args: clickArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('type'), args: typeArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('press'), args: pressArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('scroll'), args: scrollArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('wait'), args: waitArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('hover'), args: hoverArgsSchema, label: z.string().optional() }),
  z.object({
    tool: z.literal('screenshot'),
    args: screenshotArgsSchema.optional(),
    label: z.string().optional(),
  }),
  z.object({ tool: z.literal('assert'), args: assertArgsSchema, label: z.string().optional() }),
  z.object({ tool: z.literal('markBeat'), args: markBeatArgsSchema, label: z.string().optional() }),
]);

export type CaptureStepOutput = z.infer<typeof captureStepSchema>;

// ─── Intent schema ────────────────────────────────────────────────────────────

/**
 * Output of the parseIntent job — mirrors AgentIntent from @venara/shared.
 * Kept local so this package has no runtime import of shared (only type imports).
 */
export const agentIntentSchema = z.object({
  goal: z.string().min(1).describe('Plain-language goal summary (≤ 200 chars)'),
  outputType: videoTypeSchema.describe('"howto" for instructional, "marketing" for promotional'),
  targetFeature: z
    .string()
    .min(1)
    .describe('The specific product feature or page the video focuses on'),
  constraints: z
    .object({
      lengthSeconds: z
        .number()
        .positive()
        .optional()
        .describe('Requested video length in seconds, if specified'),
      aspect: renderAspectSchema
        .optional()
        .describe('Requested aspect ratio, if specified; default is "16:9" for howto, "9:16" for marketing'),
      tone: z.string().optional().describe('Brand or narrative tone, e.g. "friendly", "professional"'),
    })
    .describe('Optional constraints extracted from the user prompt'),
  needsConfirmation: z
    .boolean()
    .describe(
      'true if the request is ambiguous, touches risky/irreversible actions, or requires clarification before proceeding',
    ),
});

export type AgentIntentOutput = z.infer<typeof agentIntentSchema>;

// ─── Plan schema ──────────────────────────────────────────────────────────────

/**
 * Output of the planSteps job — mirrors AgentPlan from @venara/agent.
 */
export const agentPlanSchema = z.object({
  steps: z
    .array(captureStepSchema)
    .min(1)
    .max(40) // matches AGENT_LIMITS.maxSteps
    .describe('Ordered capture-step script using ONLY the 10 allowed verbs'),
  needsConfirmation: z
    .boolean()
    .describe('true if any step is risky or irreversible and requires user confirmation'),
  confirmationQuestion: z
    .string()
    .optional()
    .describe('Single, specific question to ask the user; present only when needsConfirmation is true'),
});

export type AgentPlanOutput = z.infer<typeof agentPlanSchema>;

// ─── Narration schema ─────────────────────────────────────────────────────────

/**
 * Output of the writeNarration job — timed narration lines aligned to capture beats.
 */
export const narrationSchema = z.object({
  lines: z
    .array(
      z.object({
        atMs: z.number().nonnegative().describe('Milliseconds offset from video start'),
        text: z.string().min(1).describe('Spoken narration text for this beat'),
      }),
    )
    .min(1)
    .describe('Narration lines ordered by atMs, one per beat'),
});

export type NarrationOutput = z.infer<typeof narrationSchema>;

// ─── Marketing copy schema ────────────────────────────────────────────────────

/**
 * Output of the writeMarketingCopy job — hook and CTA lines.
 */
export const marketingCopySchema = z.object({
  hook: z
    .string()
    .min(1)
    .max(120)
    .describe('Attention-grabbing opening line (≤ 120 chars)'),
  cta: z
    .string()
    .min(1)
    .max(80)
    .describe('Call-to-action closing line (≤ 80 chars)'),
  bodyLines: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .describe('1–5 short body lines highlighting the feature benefit'),
});

export type MarketingCopyOutput = z.infer<typeof marketingCopySchema>;

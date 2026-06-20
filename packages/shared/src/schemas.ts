/**
 * schemas.ts — Zod schemas shared across the API boundary (Brief §12).
 *
 * Route handlers validate input with these; the frontend can reuse them for typed
 * fetches. Enum schemas mirror types.ts — they are the runtime counterpart of the
 * compile-time domain vocabulary. Feature-specific request schemas are added in
 * their phase; Phase 1 ships the enums plus the /v1/me response.
 */
import { z } from 'zod';

export const userRoleSchema = z.enum(['owner', 'member']);
export const loginModeSchema = z.enum(['none', 'session']);
export const sessionStatusSchema = z.enum(['active', 'expired']);
export const videoTypeSchema = z.enum(['howto', 'marketing']);
export const freshnessSchema = z.enum(['live', 'stale']);
export const renderAspectSchema = z.enum(['16:9', '9:16', '1:1']);
export const captureStatusSchema = z.enum(['queued', 'capturing', 'done', 'failed']);
export const agentRequestStatusSchema = z.enum([
  'planning',
  'capturing',
  'rendering',
  'done',
  'failed',
  'needs_input',
]);

/** GET /v1/me response (Brief §12). */
export const meResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: userRoleSchema,
  }),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    planId: z.string(),
  }),
});

/** Pronunciation guide for a connected app (Brief §7) — app name + spoken-form lexicon. */
export const pronunciationSchema = z.object({
  name: z.string().optional(),
  lexicon: z.array(z.object({ term: z.string(), say: z.string() })).optional(),
});

/**
 * POST /v1/apps — connect an app (Brief §12, ADR-001).
 * No credentials are ever submitted here. For loginMode=session the app is created first,
 * then the user authenticates via the interactive handoff (POST /v1/apps/:id/auth/*).
 */
export const connectAppSchema = z.object({
  name: z.string().min(1).max(120),
  baseUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
      message: 'baseUrl must be an http or https URL',
    }),
  loginMode: loginModeSchema.default('none'),
  pronunciation: pronunciationSchema.optional(),
  /** The user attests they own / are authorized to capture this app (Brief §18). */
  authorized: z.literal(true),
});

/** PATCH /v1/apps/:id — update name / pronunciation (Brief §12). */
export const updateAppSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  pronunciation: pronunciationSchema.optional(),
});

/** Public shape of a connected app — never includes credentialsRef (Brief §17). */
export const connectedAppPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string(),
  loginMode: loginModeSchema,
  status: z.enum(['connected', 'error', 'disabled']),
  /** loginMode=session lifecycle: null = not yet authenticated; needs the handoff (ADR-001). */
  sessionStatus: sessionStatusSchema.nullable().optional(),
  pronunciation: pronunciationSchema.nullable().optional(),
  createdAt: z.string(),
});

export type ConnectAppInput = z.infer<typeof connectAppSchema>;
export type UpdateAppInput = z.infer<typeof updateAppSchema>;
export type ConnectedAppPublic = z.infer<typeof connectedAppPublicSchema>;

/** Standard API error envelope returned by the Fastify error handler. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** Field-level issues for 422s (from Zod), when present. */
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

// ─── Capture request schema (Phase 2) ────────────────────────────────────────

/**
 * The capture tool names as a Zod enum — mirrors `CaptureToolName` in types.ts.
 * Kept in sync manually; a mismatch is a compile-time error if the `CaptureToolName`
 * union is referenced in the inferred type.
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

/**
 * A single capture step for POST /v1/apps/:id/capture (Brief §8/§12).
 * The `args` object is kept loose (passthrough) here because per-tool argument shapes
 * are validated by the executor — keeping this schema thin avoids duplication and lets
 * the agent produce steps without a strict API-level schema per tool.
 */
export const captureStepSchema = z.object({
  tool: captureToolNameSchema,
  args: z.record(z.unknown()).optional(),
  label: z.string().optional(),
});

/**
 * POST /v1/apps/:id/capture request body (Brief §12/§19 Phase 2).
 * `steps` is optional — the API provides a hardcoded default script when omitted.
 */
export const captureRequestSchema = z.object({
  steps: z.array(captureStepSchema).optional(),
});

export type CaptureStepInput = z.infer<typeof captureStepSchema>;
export type CaptureRequestInput = z.infer<typeof captureRequestSchema>;

// ─── Video + render schemas (Phase 3) ─────────────────────────────────────────

export const videoStatusSchema = z.enum(['draft', 'ready', 'failed']);
export const renderStatusSchema = z.enum(['queued', 'rendering', 'done', 'failed']);

/** POST /v1/apps/:id/videos — create a video from a flow (Brief §12). */
export const createVideoSchema = z.object({
  flowId: z.string().min(1),
  type: videoTypeSchema,
  /** Defaults applied server-side per type (how-to → 16:9, marketing → 9:16). */
  aspect: renderAspectSchema.optional(),
});

/** A render with signed media URLs (added server-side; never stored). */
export const renderPublicSchema = z.object({
  id: z.string(),
  aspect: renderAspectSchema,
  status: renderStatusSchema,
  durationMs: z.number().nullable(),
  mp4Url: z.string().url().nullable().optional(),
  thumbUrl: z.string().url().nullable().optional(),
  captionsUrl: z.string().url().nullable().optional(),
});

/** GET /v1/videos/:id — video + current render + freshness (Brief §12/§15). */
export const videoPublicSchema = z.object({
  id: z.string(),
  connectedAppId: z.string(),
  flowId: z.string(),
  type: videoTypeSchema,
  title: z.string(),
  status: videoStatusSchema,
  freshness: freshnessSchema,
  createdAt: z.string(),
  currentRender: renderPublicSchema.nullable(),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type RenderPublic = z.infer<typeof renderPublicSchema>;
export type VideoPublic = z.infer<typeof videoPublicSchema>;

/** A flow in the app's flow map (Brief §12 GET /v1/apps/:id) — lets the UI offer "make a video". */
export const flowPublicSchema = z.object({
  id: z.string(),
  title: z.string(),
  intent: z.string().nullable(),
  status: z.enum(['discovered', 'requested', 'ready', 'archived']),
  /** Status of the flow's most recent capture, if any. */
  latestCaptureStatus: captureStatusSchema.nullable(),
  createdAt: z.string(),
});

export type FlowPublic = z.infer<typeof flowPublicSchema>;

// ─── Conversational create agent (Phase 4, Brief §9) ─────────────────────────

/** POST /v1/apps/:id/agent — start a conversational create request. */
export const createAgentRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

/** POST /v1/agent/:id/confirm — answer a needs_input confirmation (Brief §9 CONFIRM gate). */
export const confirmAgentRequestSchema = z.object({
  confirm: z.boolean(),
  /** Optional clarification (e.g. "use a test address"). */
  note: z.string().max(500).optional(),
});

/** A single live-progress line for the Create surface (never a bare spinner, Brief §9/§15). */
export const agentProgressStepSchema = z.object({
  label: z.string(),
  state: z.enum(['done', 'active', 'pending']),
});

/** GET /v1/agent/:id — status + live progress + result (Brief §9/§12). */
export const agentRequestPublicSchema = z.object({
  id: z.string(),
  connectedAppId: z.string(),
  prompt: z.string(),
  status: agentRequestStatusSchema,
  progress: z.array(agentProgressStepSchema),
  /** Present only when status === 'needs_input' — the single, specific question to ask. */
  question: z.string().nullable(),
  /** Set when the run produced a video. */
  resultVideoId: z.string().nullable(),
  /** A human-readable error when status === 'failed'. */
  error: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateAgentRequestInput = z.infer<typeof createAgentRequestSchema>;
export type ConfirmAgentRequestInput = z.infer<typeof confirmAgentRequestSchema>;
export type AgentProgressStep = z.infer<typeof agentProgressStepSchema>;
export type AgentRequestPublic = z.infer<typeof agentRequestPublicSchema>;

/**
 * Parse and validate a process environment against a Zod schema, failing fast with
 * a readable message. Used by each app to validate its own env subset at boot —
 * keeps secrets in env (Brief §17) and catches misconfiguration early.
 */
export function parseEnv<T extends z.ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

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
export const loginModeSchema = z.enum(['none', 'credentials']);
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

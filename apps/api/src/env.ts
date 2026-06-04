/**
 * env.ts — validate the API's environment subset at boot (Brief §17).
 * Secrets only ever come from env; a missing/invalid one fails fast and loud.
 */
import { parseEnv } from '@venara/shared';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ORIGINS: z.string().default('http://localhost:3000'),

  CLERK_SECRET_KEY: z.string().min(1),
  // Comma-separated authorized parties (the `azp` claim) — the dashboard origin(s).
  // Pins which Clerk app the JWT was minted for; recommended in production.
  CLERK_AUTHORIZED_PARTIES: z.string().optional(),

  // No default username — must be set explicitly so it isn't a known value.
  BULL_BOARD_USER: z.string().min(1),
  BULL_BOARD_PASSWORD: z.string().min(1),

  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
});

export const env = parseEnv(envSchema, process.env);

/** Allowed CORS origins as an array (the dashboard origin(s), Brief §16). */
export const corsOrigins = env.API_CORS_ORIGINS.split(',').map((o) => o.trim());

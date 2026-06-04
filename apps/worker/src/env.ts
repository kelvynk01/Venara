/**
 * env.ts — validate the worker's environment subset at boot (Brief §17).
 */
import { parseEnv } from '@venara/shared';
import { loadEnvFiles } from '@venara/shared/load-env';
import { z } from 'zod';

// Load .env.local + .env before reading process.env (tsx apps don't auto-load like Next).
loadEnvFiles();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // base64 32-byte key to decrypt connected-app credentials during capture (Brief §17).
  CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  /** Worker concurrency per queue. */
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),

  // Anthropic key for the agent LLM (Brief §14). Optional here; required in production
  // by the guard below — matching the CREDENTIALS_ENCRYPTION_KEY prod-guard pattern.
  // The LLM package reads this lazily so importing the module never throws (Brief §14).
  // NEVER log this value (Brief §17).
  ANTHROPIC_API_KEY: z.string().optional(),
});

const baseEnv = parseEnv(envSchema, process.env);

// The worker decrypts credentials during capture, so the key is required in production.
if (baseEnv.NODE_ENV === 'production' && !baseEnv.CREDENTIALS_ENCRYPTION_KEY) {
  throw new Error('Missing required production env: CREDENTIALS_ENCRYPTION_KEY');
}

// The agent LLM calls require the Anthropic key in production (Brief §14).
if (baseEnv.NODE_ENV === 'production' && !baseEnv.ANTHROPIC_API_KEY) {
  throw new Error('Missing required production env: ANTHROPIC_API_KEY');
}

export const env = baseEnv;

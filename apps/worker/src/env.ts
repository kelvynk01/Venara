/**
 * env.ts — validate the worker's environment subset at boot (Brief §17).
 */
import { parseEnv } from '@venara/shared';
import { z } from 'zod';

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
});

const baseEnv = parseEnv(envSchema, process.env);

// The worker decrypts credentials during capture, so the key is required in production.
if (baseEnv.NODE_ENV === 'production' && !baseEnv.CREDENTIALS_ENCRYPTION_KEY) {
  throw new Error('Missing required production env: CREDENTIALS_ENCRYPTION_KEY');
}

export const env = baseEnv;

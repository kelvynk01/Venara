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
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  /** Worker concurrency per queue. */
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
});

export const env = parseEnv(envSchema, process.env);

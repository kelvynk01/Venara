/**
 * connection.ts — ioredis connection backing the BullMQ workers (Brief §4/§13).
 * `maxRetriesPerRequest: null` is required by BullMQ workers.
 */
import IORedis from 'ioredis';
import { env } from './env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * connection.ts — the shared ioredis connection backing BullMQ producers (Brief §4/§13).
 * `maxRetriesPerRequest: null` is required by BullMQ.
 */
import IORedis from 'ioredis';
import { env } from '../env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

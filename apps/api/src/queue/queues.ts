/**
 * queues.ts — BullMQ producers (Brief §13).
 *
 * The API only ever *enqueues*; all work runs in apps/worker — never in a request
 * handler (Brief §6/§13). Each enqueue writes a Job mirror row first so status is
 * observable in the product UI + Bull Board, then adds the BullMQ job carrying that
 * row's id so the worker can update it.
 */
import { Queue } from 'bullmq';
import { QUEUE_NAMES, type QueueName } from '@venara/shared';
import { recordJob } from '@venara/db';
import { redisConnection } from './connection';

/** Phase 1: only the no-op queue exists — it proves the producer→worker→Bull Board path. */
export const noopQueue = new Queue(QUEUE_NAMES.noop, { connection: redisConnection });

/** Phase 2: capture queue — drives app + records take (Brief §13). */
export const captureQueue = new Queue(QUEUE_NAMES.capture, { connection: redisConnection });

/** Every queue the API produces to (registered with Bull Board). */
export const producerQueues: Queue[] = [noopQueue, captureQueue];

const queueByName: Partial<Record<QueueName, Queue>> = {
  [QUEUE_NAMES.noop]: noopQueue,
  [QUEUE_NAMES.capture]: captureQueue,
};

/** Payload every job carries so the worker can update the matching Job mirror row. */
export interface BaseJobData {
  jobRecordId: string;
  [key: string]: unknown;
}

/** Record a Job row and enqueue it. Returns the Job mirror id for status polling. */
export async function enqueue(
  queue: QueueName,
  type: string,
  data: Record<string, unknown> = {},
): Promise<{ jobRecordId: string }> {
  const q = queueByName[queue];
  if (!q) throw new Error(`No producer registered for queue "${queue}"`);

  const record = await recordJob({ type, payload: data });
  const jobData: BaseJobData = { jobRecordId: record.id, ...data };
  await q.add(type, jobData);
  return { jobRecordId: record.id };
}

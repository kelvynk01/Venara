/**
 * index.ts — worker entrypoint (Brief §13).
 *
 * Hosts a BullMQ Worker per queue. Phase 1 registers only the no-op queue. Failures
 * are recorded to the Job mirror so they surface in Bull Board + the product UI. The
 * worker is the ONLY place long work runs — never a request handler (Brief §6/§13).
 */
import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES } from '@venara/shared';
import { prisma, updateJobStatus } from '@venara/db';
import { redisConnection } from './connection';
import { env } from './env';
import { processCapture } from './processors/capture';
import { processNoop } from './processors/noop';
import { processRender } from './processors/render';
import { initSentry, captureError } from './sentry';

initSentry();

const workers: Worker[] = [];

function startWorker(queue: string, processor: (job: Job) => Promise<unknown>): Worker {
  const worker = new Worker(queue, processor, {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
  });

  worker.on('failed', (job, err) => {
    captureError(err);
    const jobRecordId = (job?.data as { jobRecordId?: string } | undefined)?.jobRecordId;
    if (jobRecordId) {
      // Fire-and-forget, but never swallow a DB failure silently — route it to Sentry,
      // otherwise the Job mirror could be left stuck in `active` with no trace.
      void updateJobStatus({
        id: jobRecordId,
        status: 'failed',
        attempts: job?.attemptsMade ?? 0,
        lastError: err.message,
      }).catch((dbErr) => captureError(dbErr));
    }
    // eslint-disable-next-line no-console
    console.error(`[worker:${queue}] job ${job?.id ?? '?'} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    // eslint-disable-next-line no-console
    console.log(`[worker:${queue}] job ${job.id} completed`);
  });

  // eslint-disable-next-line no-console
  console.log(`[worker:${queue}] listening (concurrency ${env.WORKER_CONCURRENCY})`);
  return worker;
}

workers.push(startWorker(QUEUE_NAMES.noop, processNoop));
workers.push(startWorker(QUEUE_NAMES.capture, processCapture));
workers.push(startWorker(QUEUE_NAMES.render, processRender));

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n[worker] ${signal} received, closing…`);
  await Promise.all(workers.map((w) => w.close()));
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

/**
 * routes/dev.ts — local-only helpers. Registered only when NODE_ENV !== 'production'.
 *
 * Phase 1: a button to push a no-op job through BullMQ so we can watch it flow to the
 * worker and appear in Bull Board (the Phase 1 Done Criteria, Brief §19).
 */
import type { FastifyInstance } from 'fastify';
import { QUEUE_NAMES } from '@venara/shared';
import { env } from '../env';
import { enqueue } from '../queue/queues';

export async function devRoutes(app: FastifyInstance): Promise<void> {
  if (env.NODE_ENV === 'production') return;

  app.post('/dev/noop', async () => {
    const { jobRecordId } = await enqueue(QUEUE_NAMES.noop, 'noop', {
      ranAt: new Date().toISOString(),
    });
    return { enqueued: true, jobRecordId };
  });
}

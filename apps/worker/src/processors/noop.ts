/**
 * processors/noop.ts — the Phase 1 no-op processor (Brief §19).
 *
 * Proves the full path: API enqueues → worker picks up → Job mirror row transitions
 * queued → active → completed → visible in Bull Board and the product UI. Real
 * processors (capture, render, diff, …) land in their phases and follow this shape.
 */
import type { Job } from 'bullmq';
import { updateJobStatus } from '@venara/db';

interface NoopData {
  jobRecordId: string;
  ranAt?: string;
}

export async function processNoop(job: Job<NoopData>): Promise<{ ok: true }> {
  const { jobRecordId } = job.data;
  if (jobRecordId) {
    await updateJobStatus({ id: jobRecordId, status: 'active', attempts: job.attemptsMade });
  }

  // Canonical processor shape: do work inside try; always resolve the Job mirror to a
  // terminal state. On throw, mark failed and rethrow so BullMQ records the failure too.
  try {
    // No work — this job exists only to exercise the queue path.
    if (jobRecordId) {
      await updateJobStatus({ id: jobRecordId, status: 'completed', attempts: job.attemptsMade });
    }
    return { ok: true };
  } catch (err) {
    if (jobRecordId) {
      await updateJobStatus({
        id: jobRecordId,
        status: 'failed',
        attempts: job.attemptsMade,
        lastError: err instanceof Error ? err.message : String(err),
      });
    }
    throw err;
  }
}

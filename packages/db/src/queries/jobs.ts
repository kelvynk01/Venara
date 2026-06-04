/**
 * queries/jobs.ts — the Job mirror (Brief §7/§13).
 *
 * BullMQ is the execution source of truth; these rows make job status observable in
 * the product UI and Bull Board. The Phase 1 no-op job exercises this whole path.
 */
import type { JobStatus, Prisma } from '@prisma/client';
import { prisma } from '../client';

export function recordJob(params: { type: string; payload?: Record<string, unknown> }) {
  return prisma.job.create({
    data: {
      type: params.type,
      // Plain serializable job payloads; cast satisfies Prisma's strict JSON input type.
      payloadJson: (params.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      status: 'queued',
    },
  });
}

export function updateJobStatus(params: {
  id: string;
  status: JobStatus;
  attempts?: number;
  lastError?: string | null;
}) {
  return prisma.job.update({
    where: { id: params.id },
    data: {
      status: params.status,
      attempts: params.attempts,
      lastError: params.lastError ?? undefined,
    },
  });
}

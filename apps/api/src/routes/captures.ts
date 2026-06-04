/**
 * routes/captures.ts — capture endpoints (Brief §12).
 *
 * POST /v1/apps/:id/capture — start a capture run (returns { captureId } immediately).
 * GET  /v1/captures/:id     — poll capture status + signed artifact URLs.
 *
 * Thin: authenticate → resolve scope → validate (Zod) → call service → shape response.
 * No business logic here (Brief §6).
 */
import { captureRequestSchema } from '@venara/shared';
import type { FastifyInstance } from 'fastify';
import { getScope } from '../lib/workspace';
import { authenticate } from '../plugins/auth';
import * as capturesService from '../services/captures.service';

export async function capturesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/apps/:id/capture
   * Accepts an optional `steps` array (Zod-validated). When absent, the service uses
   * a hardcoded default script (navigate → screenshot → markBeat) per Phase 2 Done Criteria.
   * Returns { captureId, jobRecordId } immediately; the worker does the actual recording.
   */
  app.post('/apps/:id/capture', { preHandler: authenticate }, async (req, reply) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const input = captureRequestSchema.parse(req.body ?? {});
    const result = await capturesService.startCapture(scope, id, input);
    return reply.code(202).send(result);
  });

  /**
   * GET /v1/captures/:id
   * Returns capture status + (signed) snapshot/video URLs when artifacts are ready.
   * Frontend polls every ~4 s while status is "queued" or "capturing" (Brief §16).
   */
  app.get('/captures/:id', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return capturesService.getCaptureStatus(scope, id);
  });
}

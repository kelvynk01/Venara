/**
 * routes/videos.ts — video + flow endpoints (Brief §12).
 *
 * POST /v1/apps/:id/videos  — create a video from a flow (returns VideoPublic).
 * GET  /v1/apps/:id/videos  — list videos for an app.
 * GET  /v1/apps/:id/flows   — list flows with latest capture status.
 * GET  /v1/videos/:id       — get a video with current render + signed URLs.
 * GET  /v1/videos/:id/download — 302 redirect (or { url }) to signed MP4 download URL.
 *
 * Thin: authenticate → resolve scope → validate (Zod) → call service → shape response.
 * No business logic here (Brief §6).
 */
import { createVideoSchema } from '@venara/shared';
import type { FastifyInstance } from 'fastify';
import { getScope } from '../lib/workspace';
import { authenticate } from '../plugins/auth';
import * as videosService from '../services/videos.service';

export async function videosRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/apps/:id/videos
   * Create a video from a flow; enqueues the render job immediately.
   * Returns 202 + VideoPublic (status=draft, currentRender.status=queued).
   */
  app.post('/apps/:id/videos', { preHandler: authenticate }, async (req, reply) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const input = createVideoSchema.parse(req.body);
    const result = await videosService.createVideoForApp(scope, id, input);
    return reply.code(202).send(result);
  });

  /**
   * GET /v1/apps/:id/videos
   * List all videos for an app with their current render status.
   */
  app.get('/apps/:id/videos', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return videosService.listVideos(scope, id);
  });

  /**
   * GET /v1/apps/:id/flows
   * List flows for an app, each with its latest capture status.
   * Used by the dashboard to decide which flows are ready for video creation.
   */
  app.get('/apps/:id/flows', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return videosService.listFlows(scope, id);
  });

  /**
   * GET /v1/videos/:id
   * Return a video with its current render + signed media URLs (when render is done).
   * Frontend polls every ~4 s while status is "draft" / render is "queued"/"rendering".
   */
  app.get('/videos/:id', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return videosService.getVideo(scope, id);
  });

  /**
   * GET /v1/videos/:id/download
   * Returns { url } with a signed download URL for the rendered MP4.
   * The client can follow the URL or redirect the browser to it for download.
   */
  app.get('/videos/:id/download', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const url = await videosService.getDownloadUrl(scope, id);
    return { url };
  });
}

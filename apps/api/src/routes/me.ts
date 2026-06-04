/**
 * routes/me.ts — GET /v1/me → user + workspace + plan (Brief §12).
 * Thin handler: authenticate (preHandler) → call service → return.
 */
import type { FastifyInstance } from 'fastify';
import { authenticate, getAuth } from '../plugins/auth';
import { getMe } from '../services/me.service';

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: authenticate }, async (req) => {
    const { clerkId } = getAuth(req);
    return getMe(clerkId);
  });
}

/**
 * routes/apps.ts — connected-app endpoints (Brief §12). Thin: authenticate → resolve
 * scope → validate (Zod) → call service → shape response.
 */
import { completeAuthSchema, connectAppSchema, updateAppSchema } from '@venara/shared';
import type { FastifyInstance } from 'fastify';
import { getScope } from '../lib/workspace';
import { authenticate } from '../plugins/auth';
import * as appsService from '../services/apps.service';
import * as authHandoffService from '../services/auth-handoff.service';

export async function appsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/apps', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const input = connectAppSchema.parse(req.body);
    return appsService.connectApp(scope, input);
  });

  app.get('/apps', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    return appsService.listApps(scope);
  });

  app.get('/apps/:id', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return appsService.getApp(scope, id);
  });

  app.patch('/apps/:id', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const input = updateAppSchema.parse(req.body);
    return appsService.updateApp(scope, id, input);
  });

  app.delete('/apps/:id', { preHandler: authenticate }, async (req, reply) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    await appsService.disconnectApp(scope, id);
    return reply.code(204).send();
  });

  // ── Interactive login handoff (loginMode=session, ADR-001) ──────────────────
  // Open the app's own login in a hosted browser and return an embeddable Live View.
  app.post('/apps/:id/auth/start', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return authHandoffService.startAppAuth(scope, id);
  });

  // Harvest the session the user just established in the Live View; marks app session active.
  app.post('/apps/:id/auth/complete', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const { sessionId } = completeAuthSchema.parse(req.body);
    return authHandoffService.completeAppAuth(scope, id, sessionId);
  });
}

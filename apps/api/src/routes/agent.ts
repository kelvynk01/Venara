/**
 * routes/agent.ts — conversational create agent endpoints (Brief §9/§12).
 *
 * POST /v1/apps/:id/agent         — start a conversational create run.
 * GET  /v1/agent/:id              — poll status + live progress + result.
 * POST /v1/agent/:id/confirm      — answer the CONFIRM gate question.
 *
 * Thin: authenticate → resolve scope → validate (Zod) → call service → return.
 * No business logic here (Brief §6).
 */
import { createAgentRequestSchema, confirmAgentRequestSchema } from '@venara/shared';
import type { FastifyInstance } from 'fastify';
import { getScope } from '../lib/workspace';
import { authenticate } from '../plugins/auth';
import * as agentService from '../services/agent.service';

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /v1/apps/:id/agent
   * Start a conversational create run for the connected app.
   * Returns 202 + AgentRequestPublic (status=planning).
   */
  app.post('/apps/:id/agent', { preHandler: authenticate }, async (req, reply) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const input = createAgentRequestSchema.parse(req.body);
    const result = await agentService.createAgentRun(scope, id, input);
    return reply.code(202).send(result);
  });

  /**
   * GET /v1/agent/:id
   * Return the AgentRequest with live progress steps, status, and result video id.
   * Frontend polls this every ~4 s while status is planning/capturing/rendering.
   */
  app.get('/agent/:id', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    return agentService.getAgentRun(scope, id);
  });

  /**
   * POST /v1/agent/:id/confirm
   * Answer the CONFIRM gate — either proceed (confirm=true) or cancel (confirm=false).
   * Only valid when status === 'needs_input'.
   */
  app.post('/agent/:id/confirm', { preHandler: authenticate }, async (req) => {
    const scope = await getScope(req);
    const { id } = req.params as { id: string };
    const input = confirmAgentRequestSchema.parse(req.body);
    return agentService.confirmAgentRun(scope, id, input);
  });
}

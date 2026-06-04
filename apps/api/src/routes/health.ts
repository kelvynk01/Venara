/**
 * routes/health.ts — unauthenticated liveness probe (for Railway / uptime checks).
 */
import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok', service: 'venara-api' }));
}

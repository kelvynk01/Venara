/**
 * server.ts — assemble the Fastify app (Brief §6/§12).
 *
 * Thin layering: register CORS, a single error handler that shapes every failure into
 * the `apiErrorSchema` envelope, then the route groups. The authorization header is
 * redacted from logs (Brief §17). Long work is never done here — routes only enqueue.
 */
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { API_PREFIX } from '@venara/shared';
import { corsOrigins, env } from './env';
import { AppError } from './lib/errors';
import { registerBullBoard } from './observability/bull-board';
import { captureError } from './observability/sentry';
import { appsRoutes } from './routes/apps';
import { capturesRoutes } from './routes/captures';
import { devRoutes } from './routes/dev';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Never log credentials (Brief §17).
      redact: ['req.headers.authorization'],
    },
  });

  await app.register(cors, { origin: corsOrigins, credentials: true });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(422).send({
        error: {
          code: 'validation_error',
          message: 'Invalid request',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }
    req.log.error(error);
    captureError(error);
    return reply.code(500).send({
      error: { code: 'internal_error', message: 'Something went wrong' },
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    void reply.code(404).send({ error: { code: 'not_found', message: 'Route not found' } });
  });

  // Unversioned liveness probe.
  await app.register(healthRoutes);

  // Versioned API surface (Brief §12).
  await app.register(
    async (v1) => {
      await v1.register(meRoutes);
      await v1.register(appsRoutes);
      await v1.register(capturesRoutes);
      await v1.register(devRoutes);
    },
    { prefix: API_PREFIX },
  );

  // Admin-only queue monitoring.
  await registerBullBoard(app);

  return app;
}

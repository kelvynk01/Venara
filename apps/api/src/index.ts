/**
 * index.ts — API entrypoint. Boots Sentry, builds the server, and listens (Brief §12).
 */
import { BRAND } from '@venara/shared';
import { env } from './env';
import { initSentry } from './observability/sentry';
import { buildServer } from './server';

async function main(): Promise<void> {
  initSentry();
  const app = await buildServer();

  // Drain in-flight requests on deploy (Railway sends SIGTERM) instead of TCP-resetting.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`${signal} received, closing API…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info(`${BRAND.name} API listening on http://${env.API_HOST}:${env.API_PORT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API', err);
  process.exit(1);
});

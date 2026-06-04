/**
 * Sentry — Next.js edge runtime (middleware, edge routes). No-ops without a DSN.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
  tracesSampleRate: 0.1,
});

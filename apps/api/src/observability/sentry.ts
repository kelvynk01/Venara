/**
 * sentry.ts — error monitoring for the API (Brief §4).
 * No-ops cleanly when SENTRY_DSN is unset (local dev).
 */
import * as Sentry from '@sentry/node';
import { env } from '../env';

let initialized = false;

export function initSentry(): void {
  if (initialized || !env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureError(error: unknown): void {
  if (initialized) Sentry.captureException(error);
}

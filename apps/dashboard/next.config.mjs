import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consume workspace TS packages directly (no prebuild step) per Brief §5.
  transpilePackages: ['@venara/shared'],
  // Required on Next 14 for instrumentation.ts (Sentry init per runtime).
  experimental: { instrumentationHook: true },
};

// withSentryConfig auto-detects sentry.client.config.ts and wires the build plugin.
// Source-map upload only runs when SENTRY_AUTH_TOKEN/org/project are set; otherwise no-op.
export default withSentryConfig(nextConfig, {
  silent: true,
});

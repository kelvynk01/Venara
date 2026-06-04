'use client';

/**
 * posthog.tsx — product analytics provider (Brief §4).
 * No-ops cleanly when NEXT_PUBLIC_POSTHOG_KEY is unset (local dev).
 */
import posthog from 'posthog-js';
import { PostHogProvider as Provider } from 'posthog-js/react';
import { useEffect, useState, type ReactNode } from 'react';

export function PostHogProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: true,
      person_profiles: 'identified_only',
    });
    setReady(true);
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ready) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}

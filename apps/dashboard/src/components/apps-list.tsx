'use client';

/**
 * apps-list.tsx — "Your apps" section on the Home screen (Brief §15, screen 7).
 *
 * Fetches GET /v1/apps with a fresh Clerk JWT and renders the four required states
 * (Brief §15): loading (skeleton) · empty (with connect action) · error (with retry) · loaded.
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type ConnectedAppPublic } from '@venara/shared';
import { AppWindow, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppCard } from '@/components/app-card';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'loaded'; apps: ConnectedAppPublic[] };

export function AppsList(): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const token = await getToken();
      const apps = await apiFetch<ConnectedAppPublic[]>('/v1/apps', token);
      setState(apps.length === 0 ? { status: 'empty' } : { status: 'loaded', apps });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState({ status: 'error', message });
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Your apps</h2>
        <Button size="sm" onClick={() => router.push('/connect')}>
          <Plus className="h-4 w-4" aria-hidden />
          Connect app
        </Button>
      </div>

      {state.status === 'loading' && <AppsListSkeleton />}

      {state.status === 'error' && (
        <ErrorState
          title="Couldn't load your apps"
          description={state.message}
          onRetry={() => void load()}
        />
      )}

      {state.status === 'empty' && (
        <EmptyState
          icon={<AppWindow className="h-8 w-8" />}
          title="No apps connected yet"
          description={`Connect your web app and ${BRAND.name} will drive it, film it, and turn it into how-to and marketing videos — then keep every video current as your app changes.`}
          action={
            <Button onClick={() => router.push('/connect')}>Connect your first app</Button>
          }
        />
      )}

      {state.status === 'loaded' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Skeleton grid while apps are loading. */
function AppsListSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-48" />
        </div>
      ))}
    </div>
  );
}

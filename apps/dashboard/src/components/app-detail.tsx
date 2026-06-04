'use client';

/**
 * app-detail.tsx — App detail view (Brief §15, screen 8).
 *
 * Fetches GET /v1/apps/:id; four states: loading, error, (never truly empty for a
 * single resource), loaded. Shows app name, baseUrl, login mode, and status badge.
 * Placeholder sections for Flows and Videos (coming in later phases, per the brief).
 * Includes a Disconnect button that calls DELETE /v1/apps/:id after confirmation.
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type ConnectedAppPublic, type ConnectedAppStatus } from '@venara/shared';
import { ExternalLink, Globe, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppFlows } from '@/components/app-flows';
import { AppVideos } from '@/components/app-videos';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; app: ConnectedAppPublic };

const STATUS_DISPLAY: Record<ConnectedAppStatus, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-live-surface text-live' },
  error: { label: 'Error', className: 'bg-danger/10 text-danger' },
  disabled: { label: 'Disabled', className: 'bg-neutral-100 text-neutral-500' },
};

const LOGIN_MODE_LABEL: Record<ConnectedAppPublic['loginMode'], string> = {
  none: 'No login',
  credentials: 'Test credentials',
};

export function AppDetail({ id }: { id: string }): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const token = await getToken();
      const app = await apiFetch<ConnectedAppPublic>(`/v1/apps/${id}`, token);
      setState({ status: 'loaded', app });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState({ status: 'error', message });
    }
  }, [getToken, id]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  async function handleDisconnect(): Promise<void> {
    if (
      !window.confirm(
        'Disconnect this app? This will remove the connection. Captured data is retained per the retention policy.',
      )
    ) {
      return;
    }
    setDisconnectError(null);
    setDisconnecting(true);
    try {
      const token = await getToken();
      await apiFetch<unknown>(`/v1/apps/${id}`, token, { method: 'DELETE' });
      router.push('/');
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setDisconnectError(message);
      setDisconnecting(false);
    }
  }

  if (state.status === 'loading') return <AppDetailSkeleton />;

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <ErrorState
          title="Couldn't load this app"
          description={state.message}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const { app } = state;
  const statusCfg = STATUS_DISPLAY[app.status];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-neutral-700">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-neutral-900">{app.name}</span>
      </nav>

      {/* App header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{app.name}</h1>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusCfg.className,
              )}
            >
              {statusCfg.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <a
                href={app.baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-brand-600 hover:underline"
              >
                {app.baseUrl}
                <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
              </a>
            </span>
            <span className="flex items-center gap-1.5">
              Login: <span className="font-medium text-neutral-700">{LOGIN_MODE_LABEL[app.loginMode]}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/apps/${id}/create`}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              'bg-brand-600 text-white hover:bg-brand-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Create with AI
          </Link>

          <Button
            variant="secondary"
            size="sm"
            disabled={disconnecting}
            onClick={() => void handleDisconnect()}
            className="text-danger hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
      </div>

      {disconnectError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {disconnectError}
        </div>
      )}

      {/* Divider */}
      <hr className="my-8 border-neutral-200" />

      {/* Flows section (Phase 3) */}
      <AppFlows appId={id} />

      {/* Videos section (Phase 3) */}
      <AppVideos appId={id} />
    </main>
  );
}

/** Skeleton layout for the detail page while loading. */
function AppDetailSkeleton(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Skeleton className="mb-6 h-4 w-32" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <hr className="my-8 border-neutral-200" />
      <Skeleton className="mb-4 h-4 w-16" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="mb-4 mt-10 h-4 w-16" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </main>
  );
}

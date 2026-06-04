'use client';

/**
 * workspace-greeting.tsx — the first FE↔BE round-trip (Brief §16).
 *
 * Fetches GET /v1/me with a fresh Clerk JWT and renders the four required states
 * (Brief §15): loading (skeleton) · error (with retry) · loaded. (Empty isn't
 * meaningful for a single resource.) Provisions the workspace on first call server-side.
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type MeResponse } from '@venara/shared';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: MeResponse };

export function WorkspaceGreeting(): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const token = await getToken();
      const data = await apiFetch<MeResponse>('/v1/me', token);
      setState({ status: 'loaded', data });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState({ status: 'error', message });
    }
  }, [getToken]);

  useEffect(() => {
    // Only fetch once Clerk is loaded AND the session is signed in — otherwise getToken()
    // returns null and the API would 401 with a confusing "auth required" error state.
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="Couldn't load your workspace"
        description={state.message}
        onRetry={() => void load()}
      />
    );
  }

  const { user, workspace } = state.data;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Workspace</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
        {workspace.name}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Signed in as {user.email} · {workspace.planId} plan
      </p>
    </div>
  );
}

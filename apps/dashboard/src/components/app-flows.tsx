'use client';

/**
 * app-flows.tsx — "Flows" section inside the app-detail view (Phase 3).
 *
 * Fetches GET /v1/apps/:id/flows and renders all four required states:
 * loading (skeleton) · empty (capture-needed hint) · error (with retry) · loaded.
 *
 * Flows whose `latestCaptureStatus === 'done'` surface a "Create how-to video"
 * button that POSTs to /v1/apps/:id/videos and navigates to the new video page.
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type FlowPublic, type VideoPublic } from '@venara/shared';
import { GitBranch, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'loaded'; flows: FlowPublic[] };

// ─── Capture status pill ──────────────────────────────────────────────────────

type CaptureStatus = NonNullable<FlowPublic['latestCaptureStatus']>;

const CAPTURE_PILL: Record<CaptureStatus, { label: string; className: string }> = {
  queued: {
    label: 'Queued',
    className: 'bg-neutral-100 text-neutral-500',
  },
  capturing: {
    label: 'Capturing…',
    className: 'bg-brand-50 text-brand-600',
  },
  done: {
    label: 'Ready',
    className: 'bg-live-surface text-live',
  },
  failed: {
    label: 'Failed',
    className: 'bg-danger/10 text-danger',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AppFlows({ appId }: { appId: string }): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  /** Track which flowId is currently submitting a "create video" request. */
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    setCreateError(null);
    try {
      const token = await getToken();
      const flows = await apiFetch<FlowPublic[]>(`/v1/apps/${appId}/flows`, token);
      setState(flows.length === 0 ? { status: 'empty' } : { status: 'loaded', flows });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState({ status: 'error', message });
    }
  }, [getToken, appId]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  async function handleCreateVideo(flowId: string): Promise<void> {
    setCreateError(null);
    setCreatingFor(flowId);
    try {
      const token = await getToken();
      const video = await apiFetch<VideoPublic>(`/v1/apps/${appId}/videos`, token, {
        method: 'POST',
        body: JSON.stringify({ flowId, type: 'howto' }),
      });
      router.push(`/videos/${video.id}`);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setCreateError(message);
      setCreatingFor(null);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">Flows</h2>

      {state.status === 'loading' && <FlowsSkeleton />}

      {state.status === 'error' && (
        <ErrorState
          title="Couldn't load flows"
          description={state.message}
          onRetry={() => void load()}
        />
      )}

      {state.status === 'empty' && (
        <EmptyState
          icon={<GitBranch className="h-7 w-7" />}
          title="No flows yet"
          description={`Flows are discovered automatically when ${BRAND.name} runs its first capture on your app. Trigger a capture to see flows appear here.`}
        />
      )}

      {state.status === 'loaded' && (
        <div className="space-y-2">
          {state.flows.map((flow) => (
            <FlowRow
              key={flow.id}
              flow={flow}
              isCreating={creatingFor === flow.id}
              onCreateVideo={() => void handleCreateVideo(flow.id)}
            />
          ))}
        </div>
      )}

      {createError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {createError}
        </div>
      )}
    </section>
  );
}

// ─── Flow row ─────────────────────────────────────────────────────────────────

function FlowRow({
  flow,
  isCreating,
  onCreateVideo,
}: {
  flow: FlowPublic;
  isCreating: boolean;
  onCreateVideo: () => void;
}): JSX.Element {
  const captureStatus = flow.latestCaptureStatus;
  const canCreateVideo = captureStatus === 'done';
  const pill = captureStatus ? CAPTURE_PILL[captureStatus] : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4',
        'transition-shadow hover:shadow-venara-md',
      )}
    >
      {/* Left: title + status pill */}
      <div className="flex min-w-0 items-center gap-3">
        <GitBranch className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{flow.title}</p>
          {flow.intent && (
            <p className="mt-0.5 truncate text-xs text-neutral-500">{flow.intent}</p>
          )}
        </div>
        {pill && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
              pill.className,
            )}
          >
            {pill.label}
          </span>
        )}
      </div>

      {/* Right: create video action */}
      {canCreateVideo && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isCreating}
          onClick={onCreateVideo}
        >
          <Video className="h-3.5 w-3.5" aria-hidden />
          {isCreating ? 'Creating…' : 'Create how-to video'}
        </Button>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FlowsSkeleton(): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      ))}
    </div>
  );
}

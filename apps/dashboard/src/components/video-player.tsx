'use client';

/**
 * video-player.tsx — video detail / player view (Phase 3, Brief §15 screen 9).
 *
 * Fetches GET /v1/videos/:id and renders four states:
 *   loading  — skeleton
 *   error    — ErrorState with retry
 *   polling  — "Rendering your video…" skeleton + message, polls every 4 s until done/failed
 *   done     — HTML5 <video> with poster, title, FreshnessBadge, aspect label, Download link
 *   failed   — ErrorState with retry hint
 *
 * Polling is cleared on unmount and on any terminal render state (done | failed).
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, STATUS_POLL_INTERVAL_MS, type VideoPublic } from '@venara/shared';
import { Download, Film } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorState } from '@/components/states';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; video: VideoPublic };

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoPlayer({ id }: { id: string }): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Clear any running poll interval. */
  function clearPoll(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const load = useCallback(
    async (silent = false): Promise<void> => {
      if (!silent) setState({ status: 'loading' });
      try {
        const token = await getToken();
        const video = await apiFetch<VideoPublic>(`/v1/videos/${id}`, token);
        setState({ status: 'loaded', video });

        // Stop polling once we hit a terminal render state.
        const renderStatus = video.currentRender?.status;
        if (renderStatus === 'done' || renderStatus === 'failed') {
          clearPoll();
        }
      } catch (err) {
        const message =
          err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
        setState({ status: 'error', message });
        clearPoll();
      }
    },
    [getToken, id],
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    void load();

    return () => {
      clearPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable; we only want this to run once per mount
  }, [isLoaded, isSignedIn]);

  // Start / stop polling based on render state.
  useEffect(() => {
    if (state.status !== 'loaded') return;

    const renderStatus = state.video.currentRender?.status;
    const needsPoll = renderStatus === 'queued' || renderStatus === 'rendering';

    if (needsPoll && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        void load(true);
      }, STATUS_POLL_INTERVAL_MS);
    } else if (!needsPoll) {
      clearPoll();
    }

    return () => {
      // Do NOT clear on every re-render — only on unmount (handled in the first effect).
    };
  }, [state, load]);

  // ─── Render states ──────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return <VideoPlayerSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <ErrorState
          title="Couldn't load this video"
          description={state.message}
          onRetry={() => void load()}
        />
      </main>
    );
  }

  const { video } = state;
  const render = video.currentRender;
  const renderStatus = render?.status ?? null;

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
        <Link
          href={`/apps/${video.connectedAppId}`}
          className="hover:text-neutral-700"
        >
          App
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-neutral-900">{video.title}</span>
      </nav>

      {/* Polling / rendering state */}
      {(renderStatus === 'queued' || renderStatus === 'rendering') && (
        <RenderingState video={video} />
      )}

      {/* Failed render state */}
      {renderStatus === 'failed' && (
        <ErrorState
          title="Render failed"
          description={`${BRAND.name} couldn't render this video. This may be a temporary issue — try creating the video again from the Flows section of your app.`}
        />
      )}

      {/* Ready state */}
      {renderStatus === 'done' && render?.mp4Url && (
        <ReadyState video={video} mp4Url={render.mp4Url} thumbUrl={render.thumbUrl ?? null} aspect={render.aspect} />
      )}

      {/* No render yet (video just created, status will update) */}
      {renderStatus === null && (
        <RenderingState video={video} />
      )}
    </main>
  );
}

// ─── Ready (done) state ───────────────────────────────────────────────────────

function ReadyState({
  video,
  mp4Url,
  thumbUrl,
  aspect,
}: {
  video: VideoPublic;
  mp4Url: string;
  thumbUrl: string | null;
  aspect: string;
}): JSX.Element {
  return (
    <div>
      {/* Video header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {video.title}
            </h1>
            <FreshnessBadge state={video.freshness} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Aspect: <span className="font-medium text-neutral-700">{aspect}</span>
            {'  ·  '}
            Type: <span className="font-medium text-neutral-700">{video.type}</span>
          </p>
        </div>

        <a
          href={mp4Url}
          download
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          aria-label={`Download ${video.title}`}
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
      </div>

      {/* Player */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-black shadow-venara-md">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions are a future enhancement; captionsUrl will be wired in Phase 4 */}
        <video
          controls
          src={mp4Url}
          poster={thumbUrl ?? undefined}
          className="w-full"
          style={{ aspectRatio: aspectRatioCss(aspect) }}
          preload="metadata"
        >
          Your browser does not support the video element.
        </video>
      </div>
    </div>
  );
}

// ─── Rendering / queued state ─────────────────────────────────────────────────

function RenderingState({ video }: { video: VideoPublic }): JSX.Element {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{video.title}</h1>
        <FreshnessBadge state={video.freshness} />
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50 px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
          <Film className="h-7 w-7 text-brand-600" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-neutral-900">Rendering your video…</h2>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          {BRAND.name} is assembling your video. This usually takes a minute or two. The page
          will update automatically.
        </p>

        {/* Animated skeleton to visually suggest progress */}
        <div className="mt-8 w-full max-w-md space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton (initial page load) ────────────────────────────────────────────

function VideoPlayerSkeleton(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a RenderAspect string ("16:9", "9:16", "1:1") to a CSS aspect-ratio value.
 * Falls back to "16 / 9" for any unrecognised value.
 */
function aspectRatioCss(aspect: string): string {
  switch (aspect) {
    case '9:16':
      return '9 / 16';
    case '1:1':
      return '1 / 1';
    case '16:9':
    default:
      return '16 / 9';
  }
}

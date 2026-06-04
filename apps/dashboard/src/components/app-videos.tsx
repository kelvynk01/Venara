'use client';

/**
 * app-videos.tsx — "Videos" section inside the app-detail view (Phase 3).
 *
 * Fetches GET /v1/apps/:id/videos and renders all four required states:
 * loading (skeleton grid) · empty (explains you need a capture first) ·
 * error (with retry) · loaded (responsive grid of video cards).
 *
 * Each card shows a thumbnail (or branded placeholder), title, FreshnessBadge,
 * and render status if not done. Cards link to /videos/[id].
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type VideoPublic } from '@venara/shared';
import { Film, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState } from '@/components/states';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'loaded'; videos: VideoPublic[] };

// ─── Component ────────────────────────────────────────────────────────────────

export function AppVideos({ appId }: { appId: string }): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const token = await getToken();
      const videos = await apiFetch<VideoPublic[]>(`/v1/apps/${appId}/videos`, token);
      setState(videos.length === 0 ? { status: 'empty' } : { status: 'loaded', videos });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState({ status: 'error', message });
    }
  }, [getToken, appId]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  return (
    <section>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">Videos</h2>

      {state.status === 'loading' && <VideosGridSkeleton />}

      {state.status === 'error' && (
        <ErrorState
          title="Couldn't load videos"
          description={state.message}
          onRetry={() => void load()}
        />
      )}

      {state.status === 'empty' && (
        <EmptyState
          icon={<Film className="h-7 w-7" />}
          title="No videos yet"
          description={`Videos are produced from captured flows. Once ${BRAND.name} has captured at least one flow and its status is ready, use the Flows section above to create your first how-to video.`}
        />
      )}

      {state.status === 'loaded' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: VideoPublic }): JSX.Element {
  const render = video.currentRender;
  const thumbUrl = render?.thumbUrl ?? null;
  const renderStatus = render?.status ?? null;
  const isRendering = renderStatus === 'queued' || renderStatus === 'rendering';

  return (
    <Link
      href={`/videos/${video.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white',
        'transition-shadow hover:shadow-venara-md focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-neutral-100">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed S3 URLs; next/image requires domain config
          <img
            src={thumbUrl}
            alt={`Thumbnail for ${video.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <ThumbnailPlaceholder isRendering={isRendering} />
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium text-neutral-900 group-hover:text-brand-600">
            {video.title}
          </p>
          <FreshnessBadge state={video.freshness} />
        </div>

        {isRendering && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Rendering…
          </div>
        )}

        {renderStatus === 'failed' && (
          <p className="text-xs text-danger">Render failed</p>
        )}
      </div>
    </Link>
  );
}

// ─── Thumbnail placeholder ────────────────────────────────────────────────────

function ThumbnailPlaceholder({ isRendering }: { isRendering: boolean }): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-brand-50">
      {isRendering ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" aria-hidden />
          <p className="text-xs text-brand-500">Rendering…</p>
        </>
      ) : (
        <>
          <Film className="h-8 w-8 text-brand-300" aria-hidden />
          <p className="text-xs text-brand-400">{BRAND.name}</p>
        </>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VideosGridSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

/**
 * app-card.tsx — a single connected-app card for the home apps grid (Brief §15, screen 7).
 *
 * Shows the app name, base URL host, and a status pill. Links to /apps/[id].
 * Reads only from ConnectedAppPublic — no credentials, no internal refs (Brief §17).
 */
import type { ConnectedAppPublic, ConnectedAppStatus } from '@venara/shared';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Status pill colors, mapped from ConnectedAppStatus. */
const STATUS_PILL: Record<
  ConnectedAppStatus,
  { label: string; className: string }
> = {
  connected: {
    label: 'Connected',
    className: 'bg-live-surface text-live',
  },
  error: {
    label: 'Error',
    className: 'bg-danger/10 text-danger',
  },
  disabled: {
    label: 'Disabled',
    className: 'bg-neutral-100 text-neutral-500',
  },
};

function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function AppCard({ app }: { app: ConnectedAppPublic }): JSX.Element {
  const pill = STATUS_PILL[app.status];
  const host = getHost(app.baseUrl);

  return (
    <Link
      href={`/apps/${app.id}`}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5',
        'transition-shadow hover:shadow-venara-md focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Globe className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
          <span className="truncate text-sm font-semibold text-neutral-900 group-hover:text-brand-600">
            {app.name}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
            pill.className,
          )}
        >
          {pill.label}
        </span>
      </div>

      {/* URL row */}
      <p className="truncate font-mono text-xs text-neutral-500">{host}</p>
    </Link>
  );
}

import { FRESHNESS_BADGE, type Freshness } from '@venara/shared';
import { cn } from '@/lib/cn';

/**
 * The live / out-of-date badge (Brief §15). Presets come from FRESHNESS_BADGE so the
 * treatment is identical everywhere a video badge renders.
 */
export function FreshnessBadge({ state }: { state: Freshness }): JSX.Element {
  const cfg = FRESHNESS_BADGE[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        state === 'live' ? 'bg-live-surface text-live' : 'bg-stale-surface text-stale',
      )}
    >
      <span aria-hidden>{cfg.glyph}</span>
      {cfg.label}
    </span>
  );
}

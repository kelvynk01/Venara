import { BRAND } from '@venara/shared';
import { cn } from '@/lib/cn';

/**
 * The Venara wordmark: `▶ Venara`. The play glyph leads into the V, keeping the
 * play-button relationship in the mark (Brief §21). Brand string is read from BRAND,
 * never hardcoded.
 */
export function Wordmark({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 font-semibold tracking-tight', className)}
      title={`${BRAND.name} — ${BRAND.tagline}`}
    >
      <span aria-hidden className="text-brand-600">
        {BRAND.wordmarkGlyph}
      </span>
      <span className="text-neutral-900">{BRAND.name}</span>
    </span>
  );
}

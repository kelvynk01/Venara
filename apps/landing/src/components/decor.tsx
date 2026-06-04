import { cn } from '@/lib/cn';

/**
 * Aurora — a subtle, slow violet wash for hero/CTA backdrops (UI/UX Pro Max "Aurora UI",
 * kept low-opacity for text contrast and paused under prefers-reduced-motion via CSS).
 * Pure CSS animation, no JS.
 */
export function Aurora({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute -left-[15%] top-[-25%] h-[60vh] w-[60vh] rounded-full bg-brand-300/25 blur-3xl animate-aurora" />
      <div
        className="absolute right-[-10%] top-[-15%] h-[50vh] w-[50vh] rounded-full bg-brand-200/30 blur-3xl animate-aurora"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute left-1/3 top-[5%] h-[45vh] w-[45vh] rounded-full bg-fuchsia-200/20 blur-3xl animate-aurora"
        style={{ animationDelay: '-11s' }}
      />
    </div>
  );
}

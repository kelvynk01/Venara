import { BRAND } from '@venara/shared';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Aurora } from '@/components/decor';
import { Reveal } from '@/components/motion';
import { APP_URL, cn } from '@/lib/cn';

/** Centered content container with consistent max width + responsive padding. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <div className={cn('mx-auto w-full max-w-content px-6 lg:px-8', className)}>{children}</div>;
}

/**
 * The `▶ Venara` wordmark — the play glyph leads the V (Brief §21). Brand string read
 * from BRAND, never hardcoded. Logo art is swapped in later (placeholder for now).
 */
export function Wordmark({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight', className)}
    >
      <span aria-hidden className="text-brand-600">
        {BRAND.wordmarkGlyph}
      </span>
      <span className="text-neutral-900">{BRAND.name}</span>
    </span>
  );
}

/** Small uppercase eyebrow label above section headings. */
export function Eyebrow({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
      <span aria-hidden className="h-1 w-1 rounded-full bg-brand-500" />
      {children}
    </span>
  );
}

type CtaProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  children: ReactNode;
};

/** Anchor styled as a button — used for all CTAs (links, not form submits). */
export function Cta({
  variant = 'primary',
  size = 'md',
  className,
  children,
  href = '#',
  ...props
}: CtaProps): JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm',
        variant === 'primary'
          ? 'bg-brand-600 text-white shadow-venara-sm hover:bg-brand-700'
          : 'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

/** Standard header band for subpages — aurora wash + eyebrow + title + lead. */
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}): JSX.Element {
  return (
    <section className="relative overflow-hidden border-b border-neutral-100 bg-hero-wash">
      <Aurora className="opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40" aria-hidden />
      <Container className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl">
              {title}
            </h1>
          </Reveal>
          {lead ? (
            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">{lead}</p>
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/** Reusable dark CTA band with an aurora glow — used on home + subpages. */
export function CtaBand({
  title,
  body,
  primaryHref = `${APP_URL}/sign-up`,
  primaryLabel = 'Start free',
  secondaryHref = '/contact',
  secondaryLabel = 'Get a demo',
}: {
  title: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}): JSX.Element {
  return (
    <section className="bg-white py-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-neutral-900 px-8 py-16 text-center sm:px-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden
              style={{
                background:
                  'radial-gradient(50% 60% at 50% 0%, rgba(124,58,237,0.55) 0%, transparent 70%)',
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-300">{body}</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Cta href={primaryHref} size="lg">
                  {primaryLabel}
                </Cta>
                <Cta
                  href={secondaryHref}
                  size="lg"
                  variant="secondary"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                >
                  {secondaryLabel}
                </Cta>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/** Sticky "on this page" table of contents for long legal docs. */
export function Toc({ items }: { items: { id: string; label: string }[] }): JSX.Element {
  return (
    <nav aria-label="On this page" className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">On this page</p>
      <ol className="mt-3 space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex gap-2 text-neutral-600 transition-colors hover:text-brand-700"
            >
              <span className="tabular-nums text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Lightweight prose wrapper for legal/long-form pages (no typography plugin needed). */
export function Prose({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-[15px] leading-relaxed text-neutral-600 [&_a]:font-medium [&_a]:text-brand-700 [&_a:hover]:underline [&_h2]:scroll-mt-24 [&_h2]:pt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-neutral-900 [&_h3]:pt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:text-neutral-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
      {children}
    </div>
  );
}

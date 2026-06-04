import { BRAND } from '@venara/shared';
import { Captions, Globe, RefreshCw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { Container, Eyebrow } from '@/components/primitives';
import { SpotlightCard } from '@/components/ui';
import { cn } from '@/lib/cn';

const TILES = [
  {
    icon: RefreshCw,
    title: 'Never goes stale',
    body: 'UI changes are detected, the affected videos are flagged, and only those are regenerated — on a schedule or the moment you deploy.',
  },
  {
    icon: Wand2,
    title: 'No recording, no editing',
    body: 'You never capture your screen, write a script, or open a video editor.',
  },
  {
    icon: Captions,
    title: 'Voiceover & captions',
    body: 'Natural narration that says your product name correctly, plus burned-in captions.',
  },
  {
    icon: Globe,
    title: 'Publish anywhere',
    body: 'Embed in your help center, drop into onboarding emails, export 9:16, or share a link.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by default',
    body: 'Captures use test data and non-destructive actions; anything risky asks you first.',
  },
] as const;

export function Features(): JSX.Element {
  return (
    <section id="features" className="bg-neutral-50 py-24">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Why teams switch</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              Everything you need to keep product videos shipping.
            </h2>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 lg:auto-rows-[212px] lg:grid-cols-3">
          {/* Featured tile (2×2) — the conversational create promise. */}
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <SpotlightCard className="group flex h-full flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-8 transition-colors hover:border-brand-200">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-neutral-900">
                  Just ask for the video you want
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
                  Type it in plain language. {BRAND.name}&apos;s agent plans the flow, drives your
                  app, films it, and writes the narration — no menus, no timeline.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {[
                  '“Show how to invite a teammate”',
                  '“30-sec reel of the dashboard”',
                  '“Record the checkout flow”',
                ].map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          {TILES.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 0.05}>
              <BentoTile icon={t.icon} title={t.title} body={t.body} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function BentoTile({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
}): JSX.Element {
  return (
    <SpotlightCard
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:border-brand-200',
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{body}</p>
    </SpotlightCard>
  );
}

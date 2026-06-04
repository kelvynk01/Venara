import { BRAND } from '@venara/shared';
import { Eye, RefreshCw, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Container, CtaBand, PageHeader } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'About',
  description: `Why ${BRAND.name} exists and the principles behind it.`,
};

const PRINCIPLES = [
  {
    icon: Sparkles,
    title: 'The work should be a sentence',
    body: 'Making a product video should be as easy as describing it. The agent handles the driving, filming, scripting, and editing.',
  },
  {
    icon: RefreshCw,
    title: 'Correct, forever',
    body: 'A video that’s wrong the moment you ship a UI change is worse than no video. Staying in sync is the whole point — not a feature.',
  },
  {
    icon: Eye,
    title: 'Show, don’t tell',
    body: 'The best way to explain software is to show it working. We film the real product, not a slideshow about it.',
  },
] as const;

export default function AboutPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Product video shouldn’t be a chore you redo every release."
        lead={`${BRAND.name} turns a connected web app into narrated how-to and marketing videos — and keeps every one current automatically as the product changes.`}
      />

      <section className="bg-white py-20">
        <Container>
          <div className="mx-auto max-w-3xl space-y-6 text-[15px] leading-relaxed text-neutral-600">
            <Reveal>
              <p>
                Every team that ships software needs videos — to onboard users, answer support
                questions, and market what they built. But recording them is slow, editing them is a
                skill, and the moment you change the UI, every video you made is quietly wrong.
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <p>
                {BRAND.name} takes a different path. You connect your app, then ask for the video you
                want in plain language. An agent opens your app in a real browser, performs the flow,
                films a clean take, and produces both a narrated how-to and a polished marketing cut
                from the same capture.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                The part we care about most is what happens next: when your UI changes, {BRAND.name}{' '}
                notices, flags exactly which videos are affected, and regenerates only those. Your
                library stays correct without anyone babysitting it.
              </p>
            </Reveal>
          </div>

          <Stagger className="mt-16 grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <StaggerItem key={p.title}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-base font-semibold text-neutral-900">{p.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{p.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      <CtaBand
        title="See it work on your own app."
        body="Connect an app and make your first video in minutes."
      />
    </>
  );
}

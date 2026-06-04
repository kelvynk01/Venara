import { BookOpen, Check, Megaphone } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { Container, Eyebrow } from '@/components/primitives';
import { SpotlightCard } from '@/components/ui';

const OUTPUTS = [
  {
    icon: BookOpen,
    kind: 'How-to & demo',
    title: 'Help centers, docs, and onboarding.',
    body: 'Clear voiceover, step callouts, burned-in captions. Built to teach — drop it in your help center or a welcome email.',
    points: ['Narrated walkthroughs', 'Numbered step callouts', 'Accessible captions', '16:9 + 1:1 export'],
  },
  {
    icon: Megaphone,
    kind: 'Marketing',
    title: 'Social, ads, and landing pages.',
    body: 'A tighter cut with a hook in the first two seconds, on-brand captions, an end-card CTA, and an optional presenter avatar.',
    points: ['Hook in 2 seconds', 'Optional presenter avatar', 'On-brand end-card CTA', '9:16 vertical export'],
  },
] as const;

export function Outputs(): JSX.Element {
  return (
    <section className="bg-neutral-50 py-24">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Two videos, one capture</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              The same footage becomes a how-to and a marketing reel.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-lg leading-relaxed text-neutral-600">
              Film once. Venara produces both formats — no second recording, no separate edit.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {OUTPUTS.map((o, i) => (
            <Reveal key={o.kind} delay={i * 0.08}>
              <SpotlightCard className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-8 shadow-venara-sm transition-colors hover:border-brand-200">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <o.icon className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {o.kind}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-neutral-900">{o.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{o.body}</p>
                <ul className="mt-6 grid grid-cols-2 gap-3">
                  {o.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-neutral-700">
                      <Check className="h-4 w-4 shrink-0 text-brand-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

import { Link2, MessageSquareText, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { Container, Eyebrow } from '@/components/primitives';

const STEPS = [
  {
    icon: Link2,
    title: 'Connect your app',
    body: 'Paste your app’s URL and (optionally) test credentials. Venara opens it in a real browser — nothing to install.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask for the video',
    body: 'Type what you want in plain language: “Show how to invite a teammate.” Venara plans it, drives the app, and films a clean take.',
  },
  {
    icon: Sparkles,
    title: 'Publish — and stay current',
    body: 'Get a narrated how-to and a polished marketing cut. When your UI changes, Venara flags and regenerates the affected videos.',
  },
] as const;

export function HowItWorks(): JSX.Element {
  return (
    <section id="how" className="bg-white py-24">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              From a link to a finished video — in one prompt.
            </h2>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="group h-full rounded-xl border border-neutral-200 bg-white p-6 transition-colors hover:border-brand-200">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

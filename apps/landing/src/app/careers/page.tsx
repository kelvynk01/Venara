import { BRAND } from '@venara/shared';
import { Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { Reveal } from '@/components/motion';
import { Container, Cta, PageHeader } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Careers',
  description: `Help build ${BRAND.name}.`,
};

const AREAS = [
  'Browser automation & capture reliability',
  'Applied AI / agents',
  'Video rendering pipelines',
  'Product & design',
] as const;

export default function CareersPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Help make product video effortless."
        lead={`We’re early, and we’re building deliberately. If the problem ${BRAND.name} is solving excites you, we’d like to hear from you — even if you don’t see a posting below.`}
      />

      <section className="bg-white py-20">
        <Container>
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
                <h2 className="text-xl font-semibold text-neutral-900">
                  No open roles posted right now
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
                  Rather than list roles we’re not actively hiring for, we keep this honest. If
                  you’re strong in one of the areas below, introduce yourself and tell us what you’d
                  want to build.
                </p>
                <Cta href={`mailto:${BRAND.supportEmail}?subject=Working at ${BRAND.name}`} className="mt-6">
                  <Mail className="h-4 w-4" />
                  Introduce yourself
                </Cta>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Areas we think about
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {AREAS.map((a) => (
                    <li
                      key={a}
                      className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}

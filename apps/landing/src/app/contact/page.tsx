import { BRAND } from '@venara/shared';
import { CalendarClock, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Container, PageHeader } from '@/components/primitives';
import { SpotlightCard } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get a demo or reach the ${BRAND.name} team.`,
};

const CHANNELS: { icon: LucideIcon; title: string; body: string; action: string; href: string }[] = [
  {
    icon: CalendarClock,
    title: 'Get a demo',
    body: 'See Venara run on a real app and ask anything about fit for your team.',
    action: 'Request a demo',
    href: `mailto:${BRAND.supportEmail}?subject=Demo request`,
  },
  {
    icon: LifeBuoy,
    title: 'Support',
    body: 'Already using Venara and need a hand? We’re happy to help.',
    action: 'Email support',
    href: `mailto:${BRAND.supportEmail}?subject=Support`,
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    body: 'Questions about how we handle your app and credentials, or to report an issue.',
    action: 'Contact security',
    href: `mailto:${BRAND.supportEmail}?subject=Security`,
  },
];

export default function ContactPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to us."
        lead="The fastest way to reach the team is email — we read every message."
      />

      <section className="bg-white py-20">
        <Container>
          <Stagger className="grid gap-6 md:grid-cols-3">
            {CHANNELS.map((c) => (
              <StaggerItem key={c.title}>
                <SpotlightCard className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:border-brand-200">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-base font-semibold text-neutral-900">{c.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">{c.body}</p>
                  <a
                    href={c.href}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800"
                  >
                    <Mail className="h-4 w-4" />
                    {c.action}
                  </a>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.1}>
            <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-600">
                Prefer one address for everything?{' '}
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {BRAND.supportEmail}
                </a>
              </p>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { CtaBand, Container, Cta, PageHeader } from '@/components/primitives';
import { Reveal } from '@/components/motion';
import { SpotlightCard } from '@/components/ui';
import { APP_URL, cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free. Plans for teams shipping product video on repeat.',
};

// Plan *features* are from the product spec (Brief §10/§18). Prices are NOT invented —
// paid pricing is finalized at launch, so paid tiers show a clear "at launch" state.
const TIERS = [
  {
    name: 'Free',
    price: '$0',
    cadence: '',
    blurb: 'Make your first videos and see it work end to end.',
    features: ['1 connected app', 'How-to videos', 'Watermarked exports', 'Community support'],
    cta: { label: 'Start free', href: `${APP_URL}/sign-up` },
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'At launch',
    cadence: '',
    blurb: 'For teams shipping product video on repeat.',
    features: [
      'Unlimited videos',
      'Marketing cuts + optional avatar',
      'Auto-regenerate on deploy',
      'No watermark · all aspect ratios',
    ],
    cta: { label: 'Start free', href: `${APP_URL}/sign-up` },
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    blurb: 'Security, scale, and white-glove onboarding.',
    features: ['Roles & access controls', 'Priority capture queue', 'Usage-based scaling', 'Dedicated support'],
    cta: { label: 'Talk to us', href: '/contact' },
    highlight: false,
  },
] as const;

export default function PricingPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Start free. Upgrade when video becomes a habit."
        lead="Begin on the free plan today. Paid pricing is being finalized — talk to us if you want early access for your team."
      />

      <section className="bg-white py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            {TIERS.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 0.08}>
                <SpotlightCard
                  className={cn(
                    'flex h-full flex-col rounded-2xl border bg-white p-8',
                    tier.highlight
                      ? 'border-brand-300 shadow-venara-lg ring-1 ring-brand-200'
                      : 'border-neutral-200 shadow-venara-sm',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-neutral-900">{tier.name}</h2>
                    {tier.highlight ? (
                      <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
                        Most popular
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-neutral-900">
                      {tier.price}
                    </span>
                    {tier.cadence ? (
                      <span className="text-sm text-neutral-500">{tier.cadence}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-neutral-600">{tier.blurb}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-700">
                        <Check className="h-4 w-4 shrink-0 text-brand-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Cta
                    href={tier.cta.href}
                    variant={tier.highlight ? 'primary' : 'secondary'}
                    className="mt-8 w-full"
                  >
                    {tier.cta.label}
                  </Cta>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-neutral-500">
            Free includes a watermark on exports. Paid plans remove it and unlock marketing cuts and
            auto-regenerate. Final paid pricing will be published before general availability.
          </p>
        </Container>
      </section>

      <CtaBand
        title="Try it on your own app, free."
        body="Connect an app and make your first video in minutes — no card required."
      />
    </>
  );
}

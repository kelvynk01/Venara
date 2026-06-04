import { BRAND } from '@venara/shared';
import { Play } from 'lucide-react';
import { Aurora } from '@/components/decor';
import { HeroMock } from '@/components/hero-mock';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Container, Cta } from '@/components/primitives';
import { APP_URL } from '@/lib/cn';

export function Hero(): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-hero-wash">
      <Aurora />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.18]" aria-hidden />

      <Container className="relative pt-20 pb-16 lg:pt-28 lg:pb-24">
        <Stagger className="mx-auto max-w-3xl text-center" gap={0.07}>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700 backdrop-blur">
              <span aria-hidden className="text-brand-600">
                {BRAND.wordmarkGlyph}
              </span>
              Conversational video creation — just ask
            </span>
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl">
              Product videos that
              <br className="hidden sm:block" /> never go{' '}
              <span className="text-gradient-brand">stale.</span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
              Paste your app&apos;s link. {BRAND.name} drives it, films it, and turns it into
              narrated how-to and marketing videos — then keeps every one current automatically as
              your product changes.
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Cta href={`${APP_URL}/sign-up`} size="lg">
                Start free
              </Cta>
              <Cta href="/contact" size="lg" variant="secondary">
                <Play className="h-4 w-4 fill-current" />
                Get a demo
              </Cta>
            </div>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-5 text-sm text-neutral-500">
              No screen recording. No editing. No re-recording when your UI changes.
            </p>
          </StaggerItem>
        </Stagger>

        <Reveal delay={0.15} y={28}>
          <div className="mx-auto mt-16 max-w-5xl">
            <HeroMock />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

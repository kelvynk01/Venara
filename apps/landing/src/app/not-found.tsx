import type { Metadata } from 'next';
import { Aurora } from '@/components/decor';
import { Container, Cta } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound(): JSX.Element {
  return (
    <main className="relative flex min-h-[70vh] items-center overflow-hidden bg-hero-wash">
      <Aurora />
      <Container className="relative text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-700">404</p>
        <h1 className="mx-auto mt-4 max-w-xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          This page went out of date.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-neutral-600">
          The page you’re looking for doesn’t exist — but your videos never will.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Cta href="/" size="lg">
            Back to home
          </Cta>
          <Cta href="/contact" size="lg" variant="secondary">
            Contact us
          </Cta>
        </div>
      </Container>
    </main>
  );
}

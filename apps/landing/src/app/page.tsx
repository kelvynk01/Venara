import { CtaBand } from '@/components/primitives';
import { Faq } from '@/components/sections/faq';
import { Features } from '@/components/sections/features';
import { Hero } from '@/components/sections/hero';
import { HowItWorks } from '@/components/sections/how-it-works';
import { Moat } from '@/components/sections/moat';
import { Outputs } from '@/components/sections/outputs';
import { Stats } from '@/components/sections/stats';
import { TrustBand } from '@/components/sections/trust';

export default function LandingPage(): JSX.Element {
  return (
    <main>
      <Hero />
      <TrustBand />
      <HowItWorks />
      <Outputs />
      <Moat />
      <Stats />
      <Features />
      <Faq />
      <CtaBand
        title="Paste your app's link. Get your first video in minutes."
        body="Free to start. No screen recording, no editing, no re-recording when your UI changes."
      />
    </main>
  );
}

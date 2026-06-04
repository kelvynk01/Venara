import { BRAND } from '@venara/shared';
import { Reveal } from '@/components/motion';
import { Container, Eyebrow } from '@/components/primitives';
import { FaqAccordion, type FaqItem } from '@/components/ui';

// Answers are grounded in the product spec (Brief §8/§9/§10/§11/§17/§18) — no claims beyond it.
const FAQS: FaqItem[] = [
  {
    q: 'Do I need to record my screen or edit anything?',
    a: 'No. You never record your screen, write a script, or open a video editor. You connect your app and ask for the video you want — Venara does the rest.',
  },
  {
    q: 'How does it work on my app?',
    a: 'Venara opens your app in a real, hosted browser using the URL you provide and (optionally) test credentials. It navigates like a user, performs the flow, and records a clean take. There is no SDK or plugin to install.',
  },
  {
    q: 'What happens when my UI changes?',
    a: 'Venara keeps a snapshot of what it captured. When your UI changes — on a schedule, or the moment you trigger a deploy webhook — it detects which videos are affected, marks them out of date, and regenerates only those. Auto-regenerate is a single toggle.',
  },
  {
    q: 'Is it safe to connect my app?',
    a: 'By default, captures use test data and non-destructive actions; anything that writes data, spends money, or is irreversible asks for your confirmation first. Any credentials you provide are stored as a reference to a secret store — never as plaintext, never in logs.',
  },
  {
    q: 'Can I capture an app I don’t own?',
    a: 'No. Venara is for capturing your own app with your own authorization. Filming apps you don’t own or control is out of scope.',
  },
  {
    q: 'What formats do I get?',
    a: 'A how-to cut (16:9 primary, 1:1 optional) with step callouts, voiceover, and captions; and a marketing cut (9:16 primary for social) with a hook, on-brand captions, and an optional presenter avatar.',
  },
];

export function Faq(): JSX.Element {
  return (
    <section className="bg-white py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              Questions, answered.
            </h2>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 max-w-3xl">
            <FaqAccordion items={FAQS} />
            <p className="mt-6 text-center text-sm text-neutral-500">
              Still curious?{' '}
              <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-brand-700 hover:underline">
                Ask us anything
              </a>
              .
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

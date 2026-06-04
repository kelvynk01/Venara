import { KeyRound, MousePointerClick, ShieldCheck, Wand2 } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/motion';
import { Container } from '@/components/primitives';

// Honest, verifiable product facts (Brief §8/§17/§18) — not fabricated social proof.
const POINTS = [
  { icon: KeyRound, title: 'Your app, your login', body: 'Captures run on your own app with your own (optional) test credentials.' },
  { icon: ShieldCheck, title: 'Safe by default', body: 'Test data and non-destructive actions; anything risky asks you first.' },
  { icon: MousePointerClick, title: 'Nothing to install', body: 'It drives your app in a real hosted browser — no SDK, no plugin.' },
  { icon: Wand2, title: 'Any web app', body: 'Works regardless of your stack — if it runs in a browser, Venara can film it.' },
] as const;

export function TrustBand(): JSX.Element {
  return (
    <section className="border-y border-neutral-100 bg-white py-14">
      <Container>
        <Stagger className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <StaggerItem key={p.title}>
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-500">{p.body}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

import { Aurora } from '@/components/decor';
import { CountUp, Stagger, StaggerItem } from '@/components/motion';
import { Container } from '@/components/primitives';

// True, verifiable figures only (Brief §1/§9/§10) — no invented metrics.
type Fact = { to: number; prefix?: string; suffix?: string; label: string };
const FACTS: Fact[] = [
  { to: 1, label: 'plain-language prompt to a finished video' },
  { to: 2, label: 'formats — how-to + marketing — from one capture' },
  { to: 3, label: 'export aspect ratios: 16:9, 9:16, 1:1' },
  { to: 0, label: 'screens you record, scripts you write, edits you make' },
];

export function Stats(): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-brand-700 py-20 text-white">
      <Aurora className="opacity-30 mix-blend-screen" />
      <Container className="relative">
        <Stagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((s) => (
            <StaggerItem key={s.label}>
              <div className="text-center lg:text-left">
                <div className="text-5xl font-semibold tracking-tight">
                  <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-brand-100">{s.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

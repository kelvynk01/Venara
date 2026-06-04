import { BRAND } from '@venara/shared';
import { FileLock2, KeyRound, Lock, ShieldCheck, Trash2, Users } from 'lucide-react';
import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Container, CtaBand, PageHeader } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Security',
  description: `How ${BRAND.name} handles your app, your credentials, and your data.`,
};

// Each item reflects the product's security design (Brief §7/§17/§18).
const PRACTICES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: KeyRound,
    title: 'Credentials are references, never plaintext',
    body: 'Any login you provide for a connected app is stored as a reference to a secret store — never as a plaintext column, never returned by any API, and never written to logs.',
  },
  {
    icon: ShieldCheck,
    title: 'Non-destructive by default',
    body: 'Captures use test data and read/navigate actions. Anything that writes data, spends money, or is irreversible requires your explicit confirmation before it runs.',
  },
  {
    icon: Users,
    title: 'Strict tenant isolation',
    body: 'Every piece of your data is scoped to your workspace. Requests are authenticated and authorized on each call.',
  },
  {
    icon: Lock,
    title: 'You capture your own app',
    body: 'Venara is for filming an app you own or are authorized to use. Capturing apps you don’t control is out of scope and not supported.',
  },
  {
    icon: Trash2,
    title: 'Minimal retention, real deletion',
    body: 'We keep only what’s needed to re-render and to detect UI changes. Deleting a connected app purges its stored secret reference and ages out its captures.',
  },
  {
    icon: FileLock2,
    title: 'Verified webhooks',
    body: 'Inbound webhooks (for billing and deploy triggers) have their provider signatures verified before anything is acted on.',
  },
];

export default function SecurityPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Your app and credentials, handled with care."
        lead="The practices below are built into how Venara works. Have a question or something to report? Email us and we’ll respond."
      />

      <section className="bg-white py-20">
        <Container>
          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRACTICES.map((p) => (
              <StaggerItem key={p.title}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-base font-semibold text-neutral-900">{p.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{p.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.1}>
            <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-neutral-500">
              Found a vulnerability? Please report it responsibly to{' '}
              <a
                href={`mailto:${BRAND.supportEmail}?subject=Security disclosure`}
                className="font-medium text-brand-700 hover:underline"
              >
                {BRAND.supportEmail}
              </a>{' '}
              and give us a reasonable window to address it before public disclosure.
            </p>
          </Reveal>
        </Container>
      </section>

      <CtaBand
        title="Questions about security or compliance?"
        body="Tell us what your team needs and we’ll walk you through how Venara works."
        primaryLabel="Contact us"
        primaryHref="/contact"
        secondaryLabel="Read the FAQ"
        secondaryHref="/#features"
      />
    </>
  );
}

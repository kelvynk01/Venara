import { BRAND } from '@venara/shared';
import type { Metadata } from 'next';
import { Container, PageHeader, Prose, Toc } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${BRAND.name} collects, uses, shares, and protects information.`,
};

const LAST_UPDATED = 'June 3, 2026';

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'what-we-collect', label: 'Information we collect' },
  { id: 'credentials', label: 'Connected apps & credentials' },
  { id: 'how-we-use', label: 'How we use information' },
  { id: 'legal-bases', label: 'Legal bases (EEA/UK)' },
  { id: 'cookies', label: 'Cookies & analytics' },
  { id: 'sharing', label: 'How we share information' },
  { id: 'subprocessors', label: 'Subprocessors' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'retention', label: 'Data retention' },
  { id: 'security', label: 'Security' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'us-privacy', label: 'US state privacy rights' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
];

const SUBPROCESSORS = [
  { name: 'Railway', purpose: 'Cloud hosting, application compute, and managed database' },
  { name: 'Cloudflare R2', purpose: 'Object storage for captures, renders, and thumbnails' },
  { name: 'Browserbase', purpose: 'Hosted headless browser used to drive and film your app' },
  { name: 'Anthropic', purpose: 'AI used to plan captures, understand UI, and generate scripts' },
  { name: 'ElevenLabs', purpose: 'Text-to-speech for narration' },
  { name: 'Avatar provider', purpose: 'Optional presenter avatar for marketing videos (paid)' },
  { name: 'Clerk', purpose: 'Authentication and account management' },
  { name: 'Stripe', purpose: 'Payment processing and subscription billing' },
  { name: 'Resend', purpose: 'Transactional and notification email' },
  { name: 'PostHog', purpose: 'Product analytics' },
  { name: 'Sentry', purpose: 'Error monitoring and diagnostics' },
];

export default function PrivacyPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        lead={`How ${BRAND.name} collects, uses, shares, and protects information.`}
      />

      <section className="bg-white py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Toc items={TOC} />
              <p className="mt-4 px-1 text-xs text-neutral-400">Last updated: {LAST_UPDATED}</p>
            </aside>

            <div>
              <Prose>
                <p className="!text-neutral-500">Last updated: {LAST_UPDATED}</p>

                <h2 id="overview">Overview</h2>
                <p>
                  This Privacy Policy explains how {BRAND.name} (&ldquo;{BRAND.name},&rdquo;
                  &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, shares, and
                  safeguards information when you visit {BRAND.domain}, create an account, or use our
                  service to turn a connected web application into product videos (the
                  &ldquo;Service&rdquo;). It also describes the rights and choices available to you.
                </p>
                <p>
                  By using the Service you agree to the practices described here. If you do not agree,
                  please do not use the Service.
                </p>

                <h2 id="who-we-are">Who we are</h2>
                <p>
                  The Service is operated by <strong>[Company legal entity]</strong>, the data
                  controller responsible for your personal information under this Policy. You can reach
                  us at <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. Where
                  required, our postal address and any EU/UK representative or Data Protection Officer
                  details will be provided here: <strong>[Company address / DPO contact]</strong>.
                </p>

                <h2 id="what-we-collect">Information we collect</h2>
                <p>We collect the following categories of information:</p>

                <h3>Information you provide</h3>
                <ul>
                  <li>
                    <strong>Account &amp; workspace details</strong> — your name, email address, and
                    workspace name, provided through our authentication provider when you sign up.
                  </li>
                  <li>
                    <strong>Connected application details</strong> — the URL of the app you connect,
                    its display name, a pronunciation guide you optionally add, and optional test
                    credentials used to sign in and film it (see{' '}
                    <a href="#credentials">Connected apps &amp; credentials</a>).
                  </li>
                  <li>
                    <strong>Billing information</strong> — when you subscribe to a paid plan, payment
                    details are collected and processed by our payment processor (Stripe). We do not
                    store full card numbers.
                  </li>
                  <li>
                    <strong>Communications</strong> — messages you send us for support, sales, or
                    other inquiries.
                  </li>
                </ul>

                <h3>Information generated by the Service</h3>
                <ul>
                  <li>
                    <strong>Captured content</strong> — recordings, DOM and visual snapshots, and the
                    rendered videos, thumbnails, scripts, and captions produced from the app you
                    connect.
                  </li>
                  <li>
                    <strong>Agent &amp; job records</strong> — your prompts, the plans the agent
                    produces, and processing status, retained to operate the Service and to debug and
                    improve it.
                  </li>
                </ul>

                <h3>Information collected automatically</h3>
                <ul>
                  <li>
                    <strong>Usage &amp; device data</strong> — pages viewed, features used, approximate
                    location derived from IP, browser and device type, and similar diagnostics.
                  </li>
                  <li>
                    <strong>Cookies &amp; similar technologies</strong> — used to keep you signed in
                    and to understand product usage (see <a href="#cookies">Cookies &amp; analytics</a>
                    ).
                  </li>
                </ul>

                <h2 id="credentials">Connected apps &amp; credentials</h2>
                <p>
                  The Service works by opening an app you provide in a hosted browser, performing a
                  flow, and recording it. Because this is the most sensitive data we handle, it
                  receives specific protections:
                </p>
                <ul>
                  <li>
                    Any login credentials you provide for a connected app are stored as a{' '}
                    <strong>reference to a secret store</strong> — never as plaintext, never returned
                    by our API, and never written to logs. Values typed into credential fields during a
                    capture are redacted from capture logs.
                  </li>
                  <li>
                    You may only connect an app you own or are authorized to use. Captured content is
                    processed solely to produce and maintain your videos.
                  </li>
                  <li>
                    Deleting a connected app purges its stored secret reference and ages out its
                    captures.
                  </li>
                </ul>

                <h2 id="how-we-use">How we use information</h2>
                <ul>
                  <li>To provide the Service — drive your app, film it, and produce your videos.</li>
                  <li>
                    To keep your videos current — detect when your app&apos;s UI changes and regenerate
                    affected videos.
                  </li>
                  <li>To process payments, manage subscriptions, and enforce plan limits.</li>
                  <li>To secure, maintain, debug, and improve the Service.</li>
                  <li>To communicate with you about your account, support, and service updates.</li>
                  <li>To comply with legal obligations and enforce our terms.</li>
                </ul>
                <p>
                  We do not sell your personal information, and we do not use the contents of your
                  connected apps to train third-party foundation models.
                </p>

                <h2 id="legal-bases">Legal bases (EEA/UK)</h2>
                <p>
                  If you are in the European Economic Area or the United Kingdom, we rely on the
                  following legal bases: <strong>performance of a contract</strong> (to provide the
                  Service you request); <strong>legitimate interests</strong> (to secure and improve
                  the Service, where not overridden by your rights); <strong>consent</strong> (for
                  certain analytics or communications, where required); and{' '}
                  <strong>compliance with legal obligations</strong>.
                </p>

                <h2 id="cookies">Cookies &amp; analytics</h2>
                <p>
                  We use strictly necessary cookies to authenticate you and keep you signed in, and
                  analytics technologies (via PostHog) to understand how the Service is used. You can
                  control non-essential cookies through your browser settings or any cookie controls we
                  provide. Blocking strictly necessary cookies may prevent the Service from working.
                </p>

                <h2 id="sharing">How we share information</h2>
                <p>We share information only as described below:</p>
                <ul>
                  <li>
                    <strong>Service providers (subprocessors)</strong> — vendors that process data on
                    our behalf to run the Service, under contractual confidentiality and security
                    obligations (see <a href="#subprocessors">Subprocessors</a>).
                  </li>
                  <li>
                    <strong>Legal &amp; safety</strong> — where required by law, legal process, or to
                    protect the rights, safety, and security of {BRAND.name}, our users, or the public.
                  </li>
                  <li>
                    <strong>Business transfers</strong> — in connection with a merger, acquisition, or
                    sale of assets, subject to this Policy.
                  </li>
                </ul>

                <h2 id="subprocessors">Subprocessors</h2>
                <p>
                  We engage the following categories of subprocessors to provide the Service. We
                  maintain contractual safeguards with each and update this list as our providers
                  change.
                </p>
              </Prose>

              <div className="mx-auto mt-4 max-w-3xl overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Provider</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {SUBPROCESSORS.map((s) => (
                      <tr key={s.name}>
                        <td className="px-4 py-3 font-medium text-neutral-900">{s.name}</td>
                        <td className="px-4 py-3 text-neutral-600">{s.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Prose>
                <h2 id="transfers">International data transfers</h2>
                <p>
                  We and our subprocessors may process information in countries other than your own,
                  including the United States. Where we transfer personal information out of the EEA or
                  UK, we rely on appropriate safeguards such as the European Commission&apos;s Standard
                  Contractual Clauses, the UK International Data Transfer Addendum, or another lawful
                  transfer mechanism.
                </p>

                <h2 id="retention">Data retention</h2>
                <p>
                  We keep personal information for as long as your account is active and as needed to
                  provide the Service. Captured media is retained only as long as needed to re-render
                  your videos and to detect UI changes, then aged out. When you delete a connected app
                  or your account, we delete or de-identify the associated data within a commercially
                  reasonable period, except where retention is required for legal, accounting, or
                  security purposes.
                </p>

                <h2 id="security">Security</h2>
                <p>
                  We use technical and organizational measures designed to protect your information,
                  including encryption in transit, scoped access controls, tenant isolation so each
                  workspace&apos;s data is segregated, secret-reference storage for credentials, and
                  signed-URL delivery for media. No method of transmission or storage is completely
                  secure, but we work to protect your information and to respond promptly to issues.
                </p>

                <h2 id="your-rights">Your rights</h2>
                <p>
                  Depending on where you live, you may have the right to access, correct, delete,
                  restrict, or object to our processing of your personal information, to data
                  portability, and to withdraw consent where processing is based on consent. You can
                  exercise many of these directly in the product (for example, deleting a connected
                  app or your account), or by contacting us at{' '}
                  <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. You may also have
                  the right to lodge a complaint with your local supervisory authority.
                </p>

                <h2 id="us-privacy">US state privacy rights</h2>
                <p>
                  If you are a resident of California or another US state with a comprehensive privacy
                  law, you may have rights to know, access, correct, and delete your personal
                  information, and to opt out of &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal
                  information. We do not sell personal information. To exercise your rights, contact{' '}
                  <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>; we will not
                  discriminate against you for exercising them.
                </p>

                <h2 id="children">Children</h2>
                <p>
                  The Service is not directed to children and is intended for users aged 18 and over.
                  We do not knowingly collect personal information from children. If you believe a
                  child has provided us information, contact us and we will delete it.
                </p>

                <h2 id="changes">Changes to this Policy</h2>
                <p>
                  We may update this Policy from time to time. When we make material changes, we will
                  update the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you.
                  Your continued use of the Service after an update means you accept the revised Policy.
                </p>

                <h2 id="contact">Contact us</h2>
                <p>
                  Questions or requests about privacy? Email{' '}
                  <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> or write to{' '}
                  <strong>[Company legal entity, address]</strong>.
                </p>
              </Prose>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

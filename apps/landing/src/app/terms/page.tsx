import { BRAND } from '@venara/shared';
import type { Metadata } from 'next';
import { Container, PageHeader, Prose, Toc } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms that govern your use of ${BRAND.name}.`,
};

const LAST_UPDATED = 'June 3, 2026';

const TOC = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'eligibility', label: 'Eligibility & accounts' },
  { id: 'the-service', label: 'The Service' },
  { id: 'authorization', label: 'Authorization to capture' },
  { id: 'responsibilities', label: 'Your responsibilities' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'your-content', label: 'Your content & output' },
  { id: 'ai-output', label: 'AI-generated output' },
  { id: 'billing', label: 'Plans, trials & billing' },
  { id: 'free-plan', label: 'Free plan & watermark' },
  { id: 'usage-limits', label: 'Usage limits' },
  { id: 'our-ip', label: 'Our intellectual property' },
  { id: 'third-party', label: 'Third-party services' },
  { id: 'term', label: 'Term & termination' },
  { id: 'suspension', label: 'Suspension' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'indemnification', label: 'Indemnification' },
  { id: 'changes', label: 'Changes to these Terms' },
  { id: 'governing-law', label: 'Governing law & disputes' },
  { id: 'general', label: 'General' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsPage(): JSX.Element {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        lead={`The terms that govern your access to and use of ${BRAND.name}.`}
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

                <h2 id="agreement">Agreement</h2>
                <p>
                  These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you and{' '}
                  <strong>[Company legal entity]</strong> (&ldquo;{BRAND.name},&rdquo; &ldquo;we,&rdquo;
                  &ldquo;us&rdquo;) and govern your access to and use of {BRAND.domain} and the{' '}
                  {BRAND.name} service (the &ldquo;Service&rdquo;). By accessing or using the Service,
                  you agree to these Terms and to our{' '}
                  <a href="/privacy">Privacy Policy</a>. If you use the Service on behalf of an
                  organization, you represent that you are authorized to bind that organization, and
                  &ldquo;you&rdquo; refers to that organization.
                </p>

                <h2 id="definitions">Definitions</h2>
                <ul>
                  <li>
                    <strong>&ldquo;Connected App&rdquo;</strong> — a web application you connect to the
                    Service by providing its URL and, optionally, test credentials.
                  </li>
                  <li>
                    <strong>&ldquo;Capture&rdquo;</strong> — the act of the Service opening, navigating,
                    and recording a Connected App.
                  </li>
                  <li>
                    <strong>&ldquo;Output&rdquo;</strong> — the videos, thumbnails, scripts, captions,
                    and related assets the Service generates for you.
                  </li>
                  <li>
                    <strong>&ldquo;Customer Content&rdquo;</strong> — content you provide or that is
                    captured from your Connected App, together with the Output.
                  </li>
                </ul>

                <h2 id="eligibility">Eligibility &amp; accounts</h2>
                <p>
                  You must be at least 18 years old and able to form a binding contract to use the
                  Service. You are responsible for the activity under your account and for keeping your
                  credentials secure. Notify us promptly of any unauthorized use.
                </p>

                <h2 id="the-service">The Service</h2>
                <p>
                  {BRAND.name} connects to a Connected App you provide, drives it in a hosted browser,
                  films it, and produces and maintains product videos from those Captures, including
                  detecting when the app&apos;s interface changes and regenerating affected videos.
                  Features, limits, and availability may change as the Service evolves.
                </p>

                <h2 id="authorization">Authorization to capture</h2>
                <p>
                  This is a core condition of using the Service. You represent and warrant that, for
                  every Connected App and Capture:
                </p>
                <ul>
                  <li>
                    you <strong>own or are authorized</strong> to access, automate, and record the
                    Connected App and its content;
                  </li>
                  <li>
                    any credentials you provide are ones you are permitted to use for this purpose; and
                  </li>
                  <li>
                    your use does not violate the Connected App&apos;s terms, applicable law, or any
                    third party&apos;s rights.
                  </li>
                </ul>
                <p>
                  You may not use the Service to capture applications you do not own or control.
                  Capturing third parties&apos; private applications is prohibited and is grounds for
                  suspension or termination.
                </p>

                <h2 id="responsibilities">Your responsibilities</h2>
                <ul>
                  <li>Provide accurate account and Connected App information.</li>
                  <li>Use test data and test accounts where possible when connecting an app.</li>
                  <li>
                    Review Output before publishing it; you are responsible for how you use and
                    distribute Output.
                  </li>
                  <li>Comply with these Terms, our Acceptable Use rules, and applicable law.</li>
                </ul>

                <h2 id="acceptable-use">Acceptable use</h2>
                <p>You agree not to, and not to permit anyone to:</p>
                <ul>
                  <li>capture apps you do not own or are not authorized to use;</li>
                  <li>
                    use the Service for unlawful, infringing, deceptive, harassing, or abusive
                    purposes;
                  </li>
                  <li>
                    attempt to defeat the confirmation gates that protect against destructive,
                    financial, or irreversible actions;
                  </li>
                  <li>
                    probe, scan, or test the vulnerability of, or breach the security of, the Service;
                  </li>
                  <li>
                    interfere with or disrupt the Service, or circumvent usage limits or access
                    controls;
                  </li>
                  <li>
                    reverse engineer or use the Service to build a competing product, except as
                    permitted by law.
                  </li>
                </ul>

                <h2 id="your-content">Your content &amp; output</h2>
                <p>
                  As between you and {BRAND.name}, <strong>you own your Customer Content and the
                  Output</strong>. You grant us a limited, non-exclusive license to host, process, and
                  use Customer Content solely to provide and improve the Service for you — including to
                  perform Captures, render Output, detect interface changes, and re-render affected
                  videos. We retain only what is needed to re-render your videos and to run staleness
                  checks, consistent with our <a href="/privacy">Privacy Policy</a>.
                </p>

                <h2 id="ai-output">AI-generated output</h2>
                <p>
                  The Service uses automated and AI systems to plan Captures, understand interfaces,
                  and generate narration and copy. AI output can be imperfect or inaccurate. You are
                  responsible for reviewing Output for correctness and suitability before relying on or
                  publishing it. The Service is not a substitute for your own review.
                </p>

                <h2 id="billing">Plans, trials &amp; billing</h2>
                <ul>
                  <li>
                    Paid plans are billed in advance on a recurring basis through our payment processor.
                    By subscribing, you authorize recurring charges until you cancel.
                  </li>
                  <li>
                    Fees are exclusive of taxes, which you are responsible for where applicable.
                  </li>
                  <li>
                    Metered usage above plan limits may incur additional charges as described at
                    purchase.
                  </li>
                  <li>
                    You may cancel at any time; cancellation takes effect at the end of the current
                    billing period. Except where required by law, fees are non-refundable.
                  </li>
                  <li>Final paid pricing is presented before you are charged.</li>
                </ul>

                <h2 id="free-plan">Free plan &amp; watermark</h2>
                <p>
                  We may offer a free plan with limited features. Exports produced on the free plan
                  include a {BRAND.name} watermark. We may change or discontinue the free plan at any
                  time.
                </p>

                <h2 id="usage-limits">Usage limits &amp; fair use</h2>
                <p>
                  Plans may include limits on connected apps, capture minutes, agent runs, and
                  renders. We may enforce these limits, apply rate limits, and take reasonable measures
                  to protect the Service and other customers from excessive or abusive use.
                </p>

                <h2 id="our-ip">Our intellectual property</h2>
                <p>
                  The Service, including its software, models, design, and brand, is owned by{' '}
                  {BRAND.name} and its licensors and is protected by intellectual property laws. These
                  Terms grant you no rights to our trademarks or to the Service except the limited right
                  to use it in accordance with these Terms. We welcome feedback and may use it without
                  obligation to you.
                </p>

                <h2 id="third-party">Third-party services</h2>
                <p>
                  The Service relies on third-party providers and may link to third-party sites. We are
                  not responsible for third-party services or content, and your use of them may be
                  subject to their own terms.
                </p>

                <h2 id="term">Term &amp; termination</h2>
                <p>
                  These Terms apply while you use the Service. You may stop using the Service and delete
                  your account at any time. We may suspend or terminate your access if you breach these
                  Terms, if required by law, or to protect the Service or others. On termination, your
                  right to use the Service ends; sections that by their nature should survive will
                  survive.
                </p>

                <h2 id="suspension">Suspension</h2>
                <p>
                  We may suspend access immediately if we reasonably believe there is a security risk, a
                  violation of these Terms (including the authorization requirements above), or a legal
                  or operational necessity. We will seek to give notice where practical.
                </p>

                <h2 id="disclaimers">Disclaimers</h2>
                <p>
                  THE SERVICE AND OUTPUT ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
                  AVAILABLE,&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR
                  STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                  TITLE, NON-INFRINGEMENT, AND ANY WARRANTY THAT OUTPUT WILL BE ACCURATE, ERROR-FREE, OR
                  UNINTERRUPTED.
                </p>

                <h2 id="liability">Limitation of liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.name.toUpperCase()} AND ITS SUPPLIERS
                  WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY
                  DAMAGES, OR FOR LOST PROFITS, REVENUE, OR DATA, ARISING OUT OF OR RELATED TO THE
                  SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM WILL NOT EXCEED THE AMOUNTS YOU PAID US FOR
                  THE SERVICE IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.
                </p>

                <h2 id="indemnification">Indemnification</h2>
                <p>
                  You will defend, indemnify, and hold harmless {BRAND.name} from claims, damages, and
                  costs arising out of your Customer Content, your use of the Service, or your breach of
                  these Terms — including any claim that you were not authorized to capture a Connected
                  App.
                </p>

                <h2 id="changes">Changes to these Terms</h2>
                <p>
                  We may update these Terms from time to time. When changes are material, we will update
                  the &ldquo;Last updated&rdquo; date and, where appropriate, notify you. Your continued
                  use of the Service after changes take effect constitutes acceptance.
                </p>

                <h2 id="governing-law">Governing law &amp; disputes</h2>
                <p>
                  These Terms are governed by the laws of <strong>[Governing jurisdiction]</strong>,
                  without regard to conflict-of-laws rules. The parties submit to the exclusive
                  jurisdiction of the courts located in <strong>[Venue]</strong>, except that either
                  party may seek injunctive relief in any court of competent jurisdiction. Any dispute
                  resolution, arbitration, or class-action waiver terms will be specified here:{' '}
                  <strong>[Dispute resolution terms]</strong>.
                </p>

                <h2 id="general">General</h2>
                <ul>
                  <li>
                    <strong>Entire agreement.</strong> These Terms and the Privacy Policy are the entire
                    agreement between you and us regarding the Service.
                  </li>
                  <li>
                    <strong>Severability.</strong> If any provision is unenforceable, the rest remains in
                    effect.
                  </li>
                  <li>
                    <strong>Assignment.</strong> You may not assign these Terms without our consent; we
                    may assign them in connection with a merger, acquisition, or sale of assets.
                  </li>
                  <li>
                    <strong>Waiver.</strong> A failure to enforce a provision is not a waiver of it.
                  </li>
                  <li>
                    <strong>Force majeure.</strong> Neither party is liable for delays caused by events
                    beyond its reasonable control.
                  </li>
                  <li>
                    <strong>Notices.</strong> We may provide notices via the Service or by email.
                  </li>
                </ul>

                <h2 id="contact">Contact</h2>
                <p>
                  Questions about these Terms? Email{' '}
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

import { ArrowRight, RefreshCw } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { Container, Eyebrow } from '@/components/primitives';

export function Moat(): JSX.Element {
  return (
    <section className="bg-white py-24">
      <Container>
        <div className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-50/60">
          <div className="grid items-center gap-10 p-8 lg:grid-cols-2 lg:p-14">
            <div>
              <Reveal>
                <Eyebrow>The moat</Eyebrow>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                  Every other tool ships a video that&apos;s wrong the moment you change the UI.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-4 text-lg leading-relaxed text-neutral-700">
                  Venara watches your app. When the UI changes, it detects exactly which videos are
                  affected, marks them out of date, and regenerates only those — on a schedule or the
                  moment you deploy.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700">
                  <RefreshCw className="h-4 w-4" />
                  Auto-regenerate on deploy is a single toggle.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.1} y={24}>
              <DiffVisual />
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** A small three-state strip: live → out of date → regenerated. */
function DiffVisual(): JSX.Element {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-venara-md">
      <div className="space-y-3">
        <DiffRow title="Invite a teammate" badge="live" />
        <DiffRow title="Set up billing" badge="stale" note="“Billing” tab moved to Settings" />
        <div className="flex items-center justify-center py-1">
          <ArrowRight className="h-4 w-4 rotate-90 text-neutral-300" />
        </div>
        <DiffRow title="Set up billing" badge="live" note="Regenerated automatically" />
      </div>
    </div>
  );
}

function DiffRow({
  title,
  badge,
  note,
}: {
  title: string;
  badge: 'live' | 'stale';
  note?: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/70 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        {note ? <p className="mt-0.5 text-xs text-neutral-500">{note}</p> : null}
      </div>
      {badge === 'live' ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-live-surface px-2 py-0.5 text-xs font-medium text-live">
          ● live
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-stale-surface px-2 py-0.5 text-xs font-medium text-stale">
          ⚠ out of date
        </span>
      )}
    </div>
  );
}

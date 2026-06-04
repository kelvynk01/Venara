/**
 * /connect — the "one magic input" connect-app screen (Brief §15, screen 2).
 *
 * Server component shell. The interactive form lives in ConnectForm (client component).
 * Wraps in the shared TopBar + a centred content container to match Home.
 */
import { ConnectForm } from '@/components/connect-form';
import { TopBar } from '@/components/top-bar';

export default function ConnectPage(): JSX.Element {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Connect your app
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Paste your app&apos;s URL. We&apos;ll drive it, film it, and turn it into polished
            how-to and marketing videos — then keep them current automatically.
          </p>
        </div>

        <ConnectForm />
      </main>
    </>
  );
}

/**
 * /apps/[id]/create — AI "Create with AI" composer page (Phase 4, Brief §9/§15 screen 6).
 *
 * Server component shell. Passes the dynamic `id` param to the client-side
 * CreateComposer component which owns the full compose → submit → poll lifecycle.
 */
import { CreateComposer } from '@/components/create-composer';
import { TopBar } from '@/components/top-bar';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default function CreatePage({ params }: Props): JSX.Element {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-neutral-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-neutral-700">
            Home
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <Link href={`/apps/${params.id}`} className="hover:text-neutral-700">
            App
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-neutral-900">Create with AI</span>
        </nav>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Create with AI
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Describe what you want to show in plain language. The AI will capture your app and
            produce a narrated how-to video automatically.
          </p>
        </div>

        {/* Composer — full lifecycle lives here */}
        <CreateComposer appId={params.id} />
      </main>
    </>
  );
}

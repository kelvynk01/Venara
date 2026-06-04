/**
 * home.tsx — the Home screen shell (Brief §15, screen 7).
 *
 * Server component: composes the greeting + the client-side apps list.
 * The AppsList component owns the four-state fetch cycle for GET /v1/apps.
 */
import { AppsList } from '@/components/apps-list';
import { WorkspaceGreeting } from '@/components/workspace-greeting';

export function Home(): JSX.Element {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <WorkspaceGreeting />
      <AppsList />
    </main>
  );
}

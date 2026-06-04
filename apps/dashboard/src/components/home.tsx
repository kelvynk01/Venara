import { BRAND } from '@venara/shared';
import { AppWindow, Plus } from 'lucide-react';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { WorkspaceGreeting } from '@/components/workspace-greeting';

/**
 * Home (Brief §15, screen 7). Phase 1: a logged-in user lands on an empty Home with a
 * clear next action. "Connect app" is wired up in Phase 2 (Connect + capture core).
 */
export function Home(): JSX.Element {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <WorkspaceGreeting />

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Your apps
          </h2>
          <Button size="sm" disabled title="Coming in the next phase">
            <Plus className="h-4 w-4" />
            Connect app
          </Button>
        </div>

        <EmptyState
          icon={<AppWindow className="h-8 w-8" />}
          title="No apps connected yet"
          description={`Connect your web app and ${BRAND.name} will drive it, film it, and turn it into how-to and marketing videos — then keep every video current as your app changes.`}
          action={
            <Button disabled title="Coming in the next phase">
              Connect your first app
            </Button>
          }
        />
      </section>
    </main>
  );
}

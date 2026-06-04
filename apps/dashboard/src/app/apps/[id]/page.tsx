/**
 * /apps/[id] — App detail page (Brief §15, screen 8).
 *
 * Server component shell. Receives the dynamic `id` param and passes it down to the
 * client-side AppDetail component that owns the four-state fetch cycle.
 */
import { AppDetail } from '@/components/app-detail';
import { TopBar } from '@/components/top-bar';

interface Props {
  params: { id: string };
}

export default function AppDetailPage({ params }: Props): JSX.Element {
  return (
    <>
      <TopBar />
      <AppDetail id={params.id} />
    </>
  );
}

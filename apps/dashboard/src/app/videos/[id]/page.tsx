/**
 * /videos/[id] — Video player page (Phase 3, Brief §15 screen 9).
 *
 * Server component shell. Receives the dynamic `id` param and passes it down
 * to the VideoPlayer client component that owns the fetch/poll cycle.
 */
import { VideoPlayer } from '@/components/video-player';
import { TopBar } from '@/components/top-bar';

interface Props {
  params: { id: string };
}

export default function VideoPage({ params }: Props): JSX.Element {
  return (
    <>
      <TopBar />
      <VideoPlayer id={params.id} />
    </>
  );
}

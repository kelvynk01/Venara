import { UserButton } from '@clerk/nextjs';
import { Wordmark } from '@/components/wordmark';

export function TopBar(): JSX.Element {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/80 px-6 backdrop-blur">
      <Wordmark />
      <UserButton />
    </header>
  );
}

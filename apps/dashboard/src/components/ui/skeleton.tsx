import { cn } from '@/lib/cn';

/** Loading placeholder — skeletons, never bare spinners (Brief §15/§21). */
export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={cn('animate-pulse rounded-md bg-neutral-200', className)} />;
}

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * The shared empty / error primitives. Every data-bound component renders one of four
 * states: loading (skeleton) · empty (with a next action) · error (with retry) · loaded
 * (Brief §15). No bare spinners.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-brand-600">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/20 bg-white px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

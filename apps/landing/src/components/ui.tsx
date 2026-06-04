'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * SpotlightCard — a card with a soft brand glow that follows the cursor (premium
 * micro-interaction). The glow is CSS (`.spotlight`); we only set the position vars.
 */
export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const onMove = (e: MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };
  return (
    <div onMouseMove={onMove} className={cn('spotlight', className)}>
      {children}
    </div>
  );
}

export interface FaqItem {
  q: string;
  a: string;
}

/** Animated FAQ accordion (height/opacity), one panel open at a time. */
export function FaqAccordion({ items }: { items: FaqItem[] }): JSX.Element {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-neutral-50"
            >
              <span className="text-base font-medium text-neutral-900">{item.q}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm leading-relaxed text-neutral-600">{item.a}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

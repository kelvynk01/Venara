'use client';

import { BRAND } from '@venara/shared';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Circle, Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const STEPS = [
  'Exploring your app',
  'Found team settings',
  'Found the invite flow',
  'Recording the take',
  'Writing narration & captions',
] as const;

/**
 * Animated product mock: the conversational "Create" surface advancing through the
 * capture steps (Brief §9), beside a finished video. Cycles for life; freezes mid-run
 * under prefers-reduced-motion.
 */
export function HeroMock(): JSX.Element {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(reduce ? 3 : 0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setActive((a) => (a >= STEPS.length ? 0 : a + 1));
    }, 1500);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-venara-lg">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-neutral-300" />
        <span className="h-3 w-3 rounded-full bg-neutral-300" />
        <span className="h-3 w-3 rounded-full bg-neutral-300" />
        <div className="ml-3 flex items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-neutral-400 ring-1 ring-neutral-200">
          {BRAND.wordmarkGlyph} {BRAND.domain}/create
        </div>
      </div>

      <div className="grid gap-px bg-neutral-100 md:grid-cols-2">
        {/* Left: composer + live progress */}
        <div className="bg-white p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            Create
          </div>
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            &ldquo;Make a 30-second video showing how to invite a teammate and set their role to
            admin.&rdquo;
          </div>
          <ul className="mt-5 space-y-3 text-sm">
            {STEPS.map((label, i) => (
              <ProgressRow key={label} state={i < active ? 'done' : i === active ? 'active' : 'todo'}>
                {label}
              </ProgressRow>
            ))}
          </ul>
        </div>

        {/* Right: finished video with freshness badge */}
        <div className="bg-white p-6">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-600 to-brand-800">
            <button
              type="button"
              aria-label="Play preview"
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/95 text-brand-700 shadow-venara-md transition-transform hover:scale-105"
            >
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </button>
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-live-surface px-2 py-0.5 text-xs font-medium text-live">
              ● live
            </span>
            <span className="absolute bottom-3 left-3 right-3 rounded-md bg-black/35 px-2 py-1 text-xs text-white backdrop-blur">
              1 · Open Settings → Team
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-900">Invite a teammate (How-to)</span>
            <span className="text-neutral-400">0:30 · 16:9</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  children,
  state,
}: {
  children: React.ReactNode;
  state: 'done' | 'active' | 'todo';
}): JSX.Element {
  return (
    <li className="flex items-center gap-3">
      {state === 'done' ? (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-live-surface text-live"
        >
          <Check className="h-3 w-3" />
        </motion.span>
      ) : state === 'active' ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <Circle className="h-2.5 w-2.5 animate-pulse fill-current" />
        </span>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
          <Circle className="h-2.5 w-2.5" />
        </span>
      )}
      <span
        className={
          state === 'todo' ? 'text-neutral-400 transition-colors' : 'text-neutral-700 transition-colors'
        }
      >
        {children}
      </span>
    </li>
  );
}

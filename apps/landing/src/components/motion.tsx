'use client';

/**
 * motion.tsx — restrained scroll-reveal + count-up primitives (Framer Motion).
 * Both respect prefers-reduced-motion (UI/UX Pro Max checklist).
 */
import { motion, useInView, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}): JSX.Element {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  to,
  prefix = '',
  suffix = '',
  durationMs = 1400,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const p = Math.min((now - start) / durationMs, 1);
      // easeOutCubic for a natural settle
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to, durationMs]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Container that cascades its <StaggerItem> children into view. */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
}): JSX.Element {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}): JSX.Element {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Thin reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress(): JSX.Element {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed left-0 top-0 z-[60] h-0.5 w-full origin-left bg-gradient-to-r from-brand-500 to-brand-700"
    />
  );
}

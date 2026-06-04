'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Container, Cta, Wordmark } from '@/components/primitives';
import { APP_URL, cn } from '@/lib/cn';

const LINKS = [
  { label: 'How it works', href: '/#how' },
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
] as const;

export function Nav(): JSX.Element {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        'sticky top-0 z-50 border-b transition-colors duration-300',
        scrolled
          ? 'border-neutral-200/70 bg-white/85 backdrop-blur-md'
          : 'border-transparent bg-white/0',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="cursor-pointer" aria-label={`${'Venara'} home`}>
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="cursor-pointer text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`${APP_URL}/sign-in`}
            className="hidden cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 sm:inline-flex"
          >
            Log in
          </a>
          <Cta href="/contact" className="hidden sm:inline-flex">
            Get a demo
          </Cta>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-neutral-200 bg-white md:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-4">
                <a
                  href={`${APP_URL}/sign-in`}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Log in
                </a>
                <Cta href="/contact" onClick={() => setMenuOpen(false)}>
                  Get a demo
                </Cta>
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}

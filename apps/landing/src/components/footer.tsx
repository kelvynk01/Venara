import { BRAND } from '@venara/shared';
import Link from 'next/link';
import { Container, Wordmark } from '@/components/primitives';
import { APP_URL } from '@/lib/cn';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#how' },
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/security' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Security', href: '/security' },
    ],
  },
] as const;

export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-neutral-200 bg-white py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              {BRAND.description}
            </p>
            <a
              href={`${APP_URL}/sign-up`}
              className="mt-5 inline-flex cursor-pointer text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Start free →
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-neutral-900">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="cursor-pointer text-sm text-neutral-500 transition-colors hover:text-neutral-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-8 text-sm text-neutral-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <a
            href={`mailto:${BRAND.supportEmail}`}
            className="cursor-pointer transition-colors hover:text-neutral-700"
          >
            {BRAND.supportEmail}
          </a>
        </div>
      </Container>
    </footer>
  );
}

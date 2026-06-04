import { BRAND } from '@venara/shared';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { ScrollProgress } from '@/components/motion';
import { Nav } from '@/components/nav';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: BRAND.url,
    siteName: BRAND.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <ScrollProgress />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}

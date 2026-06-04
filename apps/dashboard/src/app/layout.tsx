import { ClerkProvider } from '@clerk/nextjs';
import { BRAND } from '@venara/shared';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { PostHogProvider } from '@/lib/posthog';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en" className={`${inter.variable} ${mono.variable}`}>
        <body className="min-h-full bg-neutral-50 text-neutral-900">
          <PostHogProvider>{children}</PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

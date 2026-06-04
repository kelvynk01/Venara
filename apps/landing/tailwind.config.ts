import type { Config } from 'tailwindcss';
// Brand/design tokens come from the ONE source (Brief §21). The landing site shares the
// product's purple identity so brand is consistent across marketing and app.
import { tokens } from '@venara/shared/brand';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: tokens.color.brand,
        neutral: tokens.color.neutral,
        live: { DEFAULT: tokens.color.freshness.live, surface: tokens.color.freshness.liveSurface },
        stale: {
          DEFAULT: tokens.color.freshness.stale,
          surface: tokens.color.freshness.staleSurface,
        },
      },
      fontFamily: {
        sans: [...tokens.typography.fontFamily.sans],
        mono: [...tokens.typography.fontFamily.mono],
      },
      borderRadius: { ...tokens.radius },
      boxShadow: {
        'venara-sm': tokens.shadow.sm,
        'venara-md': tokens.shadow.md,
        'venara-lg': tokens.shadow.lg,
      },
      maxWidth: { content: '72rem' },
    },
  },
  plugins: [],
};

export default config;

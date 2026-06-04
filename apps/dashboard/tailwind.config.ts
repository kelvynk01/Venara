import type { Config } from 'tailwindcss';
// Design tokens come from the ONE brand source (Brief §21). Never hardcode brand
// colors/type in components — extend the theme from `tokens` and use the classes.
import { tokens } from '@venara/shared/brand';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: tokens.color.brand,
        neutral: tokens.color.neutral,
        live: {
          DEFAULT: tokens.color.freshness.live,
          surface: tokens.color.freshness.liveSurface,
        },
        stale: {
          DEFAULT: tokens.color.freshness.stale,
          surface: tokens.color.freshness.staleSurface,
        },
        success: tokens.color.status.success,
        warning: tokens.color.status.warning,
        danger: tokens.color.status.danger,
        info: tokens.color.status.info,
      },
      fontFamily: {
        // Tokens are `as const` (readonly); Tailwind wants mutable arrays.
        sans: [...tokens.typography.fontFamily.sans],
        mono: [...tokens.typography.fontFamily.mono],
      },
      fontSize: { ...tokens.typography.fontSize },
      borderRadius: { ...tokens.radius },
      boxShadow: {
        'venara-sm': tokens.shadow.sm,
        'venara-md': tokens.shadow.md,
        'venara-lg': tokens.shadow.lg,
      },
    },
  },
  plugins: [],
};

export default config;

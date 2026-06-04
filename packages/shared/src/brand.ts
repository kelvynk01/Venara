/**
 * brand.ts — the single source of truth for the Venara brand.
 *
 * Brief §0 / §21: the brand name lives in ONE config constant. Never hardcode the
 * string "Venara" in components — read it from `BRAND`. Never hardcode color or type
 * values in components — read them from `tokens`. A future rename or re-theme is then
 * a one-line change here, and the Tailwind config consumes these tokens directly.
 *
 * The wordmark: `▶ Venara` — the V doubles as a play button. Keep that relationship
 * in any rendering of the mark (Brief §21).
 */

export const BRAND = {
  /** Product name. The only place this string is authored. */
  name: 'Venara',
  /** Primary domain. */
  domain: 'venara.ai',
  url: 'https://venara.ai',
  /** One-line positioning (Brief §1). */
  tagline: 'Product videos that never go stale.',
  /** Longer descriptor for meta tags / og. */
  description:
    "Paste your app's link. Venara films it and turns it into narrated how-to and " +
    'marketing videos — then keeps every video current automatically as your app changes.',
  /** The play-glyph that precedes the wordmark. The V continues the play motif. */
  wordmarkGlyph: '▶',
  /** Support / from address handle. */
  supportEmail: 'hello@venara.ai',
} as const;

/**
 * Design tokens. The Tailwind config (apps/dashboard) maps these into theme values,
 * and shadcn/ui CSS variables derive from them. Purple-centered, deliberately
 * restrained — not the default AI-SaaS gradient look (Brief §21).
 */
export const tokens = {
  color: {
    /** Brand violet scale. Primary actions use 600/700. */
    brand: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
      950: '#2E1065',
    },
    /** Neutral / surface scale (slate-leaning, cool to sit under violet). */
    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },
    /** Semantic freshness colors — used by the live / stale badges (Brief §15). */
    freshness: {
      /** `● live` — video matches the current app. */
      live: '#16A34A',
      liveSurface: '#DCFCE7',
      /** `⚠ out of date` — app UI changed; video may be wrong. */
      stale: '#D97706',
      staleSurface: '#FEF3C7',
    },
    /** General status colors. */
    status: {
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      info: '#2563EB',
    },
  },

  /** One type scale, one set of families (Brief §21). */
  typography: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    /** rem-based modular scale. */
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
  },

  /** Consistent spacing scale (multiples of 4px). */
  spacing: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    6: '1.5rem',
    8: '2rem',
    12: '3rem',
    16: '4rem',
    24: '6rem',
  },

  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  /** Restrained shadows — depth without the generic glow. */
  shadow: {
    sm: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
    md: '0 4px 12px -2px rgb(15 23 42 / 0.08)',
    lg: '0 12px 32px -8px rgb(15 23 42 / 0.16)',
  },
} as const;

/**
 * Freshness badge presets (Brief §15) — consumed everywhere a video badge renders,
 * so the live/stale treatment is identical across the app.
 */
export const FRESHNESS_BADGE = {
  live: {
    label: 'live',
    glyph: '●',
    color: tokens.color.freshness.live,
    surface: tokens.color.freshness.liveSurface,
  },
  stale: {
    label: 'out of date',
    glyph: '⚠',
    color: tokens.color.freshness.stale,
    surface: tokens.color.freshness.staleSurface,
  },
} as const;

export type FreshnessBadge = keyof typeof FRESHNESS_BADGE;
export type BrandTokens = typeof tokens;

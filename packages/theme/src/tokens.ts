/**
 * Design tokens — the single source of truth for the whole Duncit console
 * design system. Colors, fonts, font-sizes, radii and surface treatments live
 * ONLY here; component overrides and the palette/typography builders consume
 * these. Nothing in a portal should hardcode a colour, size or font — pass a
 * brand `accent` to `createDuncitTheme` and everything else flows from here.
 */
export const tokens = {
  common: { white: '#ffffff', black: '#000000' },

  // Neutral ramp (light-mode ink + surfaces).
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Status / secondary colours shared by every portal — the LIGHT-mode values.
  // Each clears WCAG AA 4.5:1 as text on paper, bg and soft, and under white
  // text as a fill (`node scripts/verify-contrast.mjs`). `accent` is decorative.
  semantic: {
    success: '#137333',
    warning: '#a14e06',
    error: '#c62828',
    info: '#1d4ed8',
    secondary: '#7c3aed',
    accent: '#06b6d4',
  },

  // Light-mode surfaces, plus the text and field outline that sit on them.
  surface: {
    bg: '#f8fafc',
    paper: '#ffffff',
    soft: '#f1f5f9',
    // Hairline dividers and card edges — decorative, not a field boundary.
    border: '#e5e7eb',
    // Secondary text: 4.5:1 on paper, bg and soft.
    muted: '#606774',
    // A form field's outline: 3:1 against paper and bg (WCAG 1.4.11).
    inputBorder: '#878e9a',
  },

  // Dark-mode counterparts.
  dark: {
    ink: '#f4f6fb',
    muted: '#9aa3b2',
    bg: '#0b1220',
    surface: '#111a2e',
    border: 'rgba(255,255,255,0.10)',
    inputBorder: '#737b88',
    gradientFrom: '#100d18',
    gradientTo: '#08070b',
    // Lighter status colours: 4.5:1 as text on bg and surface, and under
    // `neutral[900]` text as a fill.
    semantic: {
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      secondary: '#a78bfa',
      accent: '#22d3ee',
    },
  },

  // Corner radii (px).
  radius: { xs: 4, sm: 6, md: 8, lg: 10 },

  // Component sizing (px) so spacing/heights aren't hardcoded in overrides.
  size: {
    buttonPadX: 18,
    buttonPadY: 9,
    buttonLgPadX: 20,
    buttonLgPadY: 11,
    chipHeight: 30,
    chipPadX: 6,
    touchTarget: 44,
    scrollbar: 8,
    helperGap: 5,
    headerHeight: 48,
    // The fixed strip along the bottom of every console: what is running on the
    // left, the clock on the right. Read by the shell layout, by the drawer
    // papers beside it and by every floating window that must not hide under it.
    taskbarHeight: 40,
    drawerWidth: 256,
  },

  // Typography.
  font: {
    family:
      '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    size: {
      body1: '0.95rem',
      body2: '0.875rem',
      caption: '0.75rem',
      buttonLg: '0.92rem',
      tooltip: '0.75rem',
    },
    weight: { regular: 400, medium: 600, semibold: 700, bold: 800 },
  },

  // Brand accent used when a portal doesn't pass its own: the Duncit CTA red,
  // which white text clears at 4.81:1, with hover/pressed steps that only get
  // darker. Any accent is still made AA-safe by `buildThemeCtx`.
  defaultAccent: { light: '#ff9e9e', main: '#d92d2d', hover: '#c62226', active: '#b42323' },
} as const;

export type Tokens = typeof tokens;

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

  // Status / secondary colours shared by every portal.
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
  },

  // Light-mode surfaces.
  surface: {
    bg: '#f8fafc',
    paper: '#ffffff',
    soft: '#f1f5f9',
    border: '#e5e7eb',
  },

  // Dark-mode counterparts.
  dark: {
    ink: '#f4f6fb',
    muted: '#9aa3b2',
    bg: '#0b1220',
    surface: '#111a2e',
    border: 'rgba(255,255,255,0.10)',
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

  // Brand accent used when a portal doesn't pass its own (Duncit red).
  defaultAccent: { light: '#ff9e9e', main: '#ff5757', hover: '#f03e3e', active: '#d92d2d' },
} as const;

export type Tokens = typeof tokens;

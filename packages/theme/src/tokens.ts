/**
 * Design tokens — the single source of truth for the whole Duncit console
 * design system. Colors, fonts, font-sizes, radii, elevation, motion and
 * surface treatments live ONLY here; component overrides and the
 * palette/typography builders consume these. Nothing in a portal should
 * hardcode a colour, size or font — pass a brand `accent` to
 * `createDuncitTheme` and everything else flows from here.
 *
 * The language is a quiet, dense workspace: flat surfaces separated by
 * hairlines, one raised layer for things that float (menus, dialogs), muted
 * secondary text and state shown as a tint rather than a colour change.
 */
export const tokens = {
  common: { white: '#ffffff', black: '#000000' },

  // Neutral ramp (light-mode ink + surfaces). A cool zinc, so the dark mode
  // built from the same family reads as graphite rather than navy.
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
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
    // The app ground: sidebar, page behind the content panel.
    bg: '#f7f7f8',
    // Content panel, cards, tables.
    paper: '#ffffff',
    // Quiet fills: table headers, code, inactive chips.
    soft: '#f0f0f2',
    // What floats: menus, popovers, dialogs.
    raised: '#ffffff',
    // Hairline dividers and card edges — decorative, not a field boundary.
    border: '#e4e4e7',
    // Secondary text: 4.5:1 on paper, bg and soft.
    muted: '#5f606a',
    // A form field's outline: 3:1 against paper, bg and soft (WCAG 1.4.11).
    inputBorder: '#85868f',
  },

  // Dark-mode counterparts.
  dark: {
    ink: '#ececef',
    // 4.5:1 on bg, surface and raised.
    muted: '#9c9fa8',
    bg: '#101116',
    surface: '#16171d',
    soft: '#1a1b21',
    raised: '#1d1e25',
    border: 'rgba(255,255,255,0.08)',
    // 3:1 on bg, surface and raised.
    inputBorder: '#676b76',
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
  radius: { xs: 4, sm: 6, md: 8, lg: 12 },

  // Elevation. Only what floats casts a shadow — cards and panels are flat and
  // separated by a hairline. Geometry here; the colour is mixed per mode.
  shadow: {
    raised: '0 1px 2px 0',
    overlay: '0 8px 24px -4px',
    dialog: '0 24px 64px -12px',
    alpha: { light: 0.16, dark: 0.6 },
    // The dialog scrim's black, per mode.
    scrim: { light: 0.36, dark: 0.64 },
  },

  // Opacity of the ink tint that marks a state on a transparent control, and
  // how strongly a status colour washes a soft chip / alert (per mode).
  state: {
    hover: 0.05,
    selected: 0.08,
    ring: 0.28,
    outline: 0.14,
    tint: { light: 0.1, dark: 0.16 },
    tintBorder: { light: 0.28, dark: 0.32 },
  },

  // Motion (ms). Short and decelerating: a console should feel immediate.
  motion: {
    fast: 120,
    base: 180,
    slow: 240,
    ease: 'cubic-bezier(0.2, 0, 0, 1)',
  },

  // Component sizing (px) so spacing/heights aren't hardcoded in overrides.
  size: {
    controlSm: 28,
    controlMd: 32,
    controlLg: 40,
    buttonPadX: 12,
    buttonPadY: 6,
    buttonLgPadX: 16,
    buttonLgPadY: 9,
    chipHeight: 24,
    chipPadX: 4,
    navRow: 30,
    touchTarget: 44,
    scrollbar: 10,
    helperGap: 4,
    headerHeight: 48,
    // The fixed strip along the bottom of every console: what is running on the
    // left, the clock on the right. Read by the shell layout, by the drawer
    // papers beside it and by every floating window that must not hide under it.
    taskbarHeight: 40,
    drawerWidth: 244,
    // How far the content panel sits in from the app ground on a wide screen.
    panelInset: 8,
    // The selected-tab / active-row marker.
    indicator: 2,
    // Glyphs inside buttons, chips and nav rows.
    icon: { sm: 16, md: 18 },
    // A compact pill toggle: track size + thumb, with the thumb `inset` from
    // the track edge and the root padded by `pad` for its hover halo.
    switch: {
      md: { width: 34, height: 20, thumb: 14 },
      sm: { width: 28, height: 16, thumb: 10 },
      pad: 6,
      inset: 3,
    },
  },

  // Typography. The platform UI face — SF on Apple, Segoe on Windows, Roboto
  // on Android — so nothing is downloaded before the first paint and text
  // renders the way each OS draws its own interface.
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, Consolas, monospace',
    size: {
      h3: '1.875rem',
      h4: '1.5rem',
      h5: '1.25rem',
      h6: '1rem',
      subtitle1: '0.9375rem',
      subtitle2: '0.8125rem',
      body1: '0.875rem',
      body2: '0.8125rem',
      caption: '0.75rem',
      overline: '0.6875rem',
      button: '0.8125rem',
      buttonLg: '0.875rem',
      tooltip: '0.75rem',
    },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },

  // Brand accent used when a portal doesn't pass its own: the Duncit CTA red,
  // which white text clears at 4.81:1, with hover/pressed steps that only get
  // darker. Any accent is still made AA-safe by `buildThemeCtx`.
  defaultAccent: { light: '#ff9e9e', main: '#d92d2d', hover: '#c62226', active: '#b42323' },
} as const;

export type Tokens = typeof tokens;

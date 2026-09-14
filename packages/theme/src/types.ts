import type { PaletteMode } from '@mui/material';
import type { Tokens } from './tokens';

/** Per-portal brand accent. Only this differs between portals. */
export interface AccentColors {
  light: string;
  main: string;
  hover: string;
  active: string;
}

export type ColorMode = PaletteMode;

/** The status colours for the active mode — same keys in light and dark. */
export type SemanticColors = { readonly [K in keyof Tokens['semantic']]: string };

/**
 * Two palette entries beyond MUI's own, present in `@duncit/theme` AND in
 * mWeb's theme so a package rendered on both can use them:
 * - `accent` — the red (or portal accent) for TEXT, links, active tabs and
 *   focus rings: 4.5:1 on every ground of the mode. `sx={{ color: 'accent.main' }}`.
 * - `brand` — the exact brand colour for decoration only (logo, illustration,
 *   large display type). Never body text, never a fill under text.
 */
declare module '@mui/material/styles' {
  interface Palette {
    accent: { main: string; contrastText: string };
    brand: { main: string };
  }
  interface PaletteOptions {
    accent?: { main: string; contrastText: string };
    brand?: { main: string };
  }
}

/**
 * Derived theme context handed to every component override builder. All values
 * are computed from `tokens` + the portal accent + the current mode, so the
 * override files never hardcode a colour or size.
 */
export interface ThemeCtx {
  mode: ColorMode;
  isDark: boolean;
  accent: AccentColors;
  /**
   * The accent as TEXT for this mode — 4.5:1 on paper/bg/soft in light mode and
   * on bg/surface in dark mode. It is `palette.primary.main`, the outline and
   * focus-ring colour, and what every `color="primary"` renders in.
   */
  primary: string;
  /** Text on a `primary` fill: white when it clears 4.5:1, dark ink otherwise. */
  onPrimary: string;
  /** The accent as a FILL under white text (4.5:1) — contained buttons, filled chips, selected rows. */
  primaryFill: string;
  primaryLight: string;
  /** Darker than `primaryFill`; white text still clears 4.5:1. */
  primaryHover: string;
  /** Darker than `primaryHover`; white text still clears 4.5:1. */
  primaryActive: string;
  ink: string;
  muted: string;
  border: string;
  /** A form field's outline — 3:1 against the surfaces it sits on. */
  inputBorder: string;
  bg: string;
  surface: string;
  /** Status colours readable as text in this mode. */
  semantic: SemanticColors;
  /** Text on a filled status colour. */
  onSemantic: string;
  appBg: string;
  surfaceGradient: string;
  white: string;
  t: Tokens;
}

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

/**
 * Derived theme context handed to every component override builder. All values
 * are computed from `tokens` + the portal accent + the current mode, so the
 * override files never hardcode a colour or size.
 */
export interface ThemeCtx {
  mode: ColorMode;
  isDark: boolean;
  accent: AccentColors;
  primary: string;
  primaryLight: string;
  primaryHover: string;
  primaryActive: string;
  ink: string;
  muted: string;
  border: string;
  bg: string;
  surface: string;
  appBg: string;
  surfaceGradient: string;
  white: string;
  t: Tokens;
}

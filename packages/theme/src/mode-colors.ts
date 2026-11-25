/**
 * The console colours for one mode, worked out from the tokens and a brand
 * accent — the MUI-free half of `buildThemeCtx`. It imports nothing but the
 * tokens and the contrast maths, so a React Native console (the Duncit CRM
 * app, through `@duncit/theme/mode-colors`) paints exactly what the portal
 * paints without pulling in MUI.
 */

import { tokens } from './tokens';
import { darkerThan, ensureContrast, fillForWhite, textOn } from './contrast';

/** Same shape as `AccentColors`, declared here so this file needs no MUI type. */
export interface ModeAccent {
  light: string;
  main: string;
  hover: string;
  active: string;
}

export type ConsoleMode = 'light' | 'dark';

export interface ModeColors {
  /** The accent as TEXT: 4.5:1 on every ground of the mode (links, outlines, active tabs). */
  primary: string;
  /** Text on a `primary` fill. */
  onPrimary: string;
  /** The accent as a FILL under white text (contained buttons, filled chips, selected rows). */
  primaryFill: string;
  primaryLight: string;
  /** Darker than `primaryFill`; white text still clears 4.5:1. */
  primaryHover: string;
  /** Darker than `primaryHover`; white text still clears 4.5:1. */
  primaryActive: string;
  ink: string;
  muted: string;
  border: string;
  inputBorder: string;
  bg: string;
  surface: string;
  soft: string;
  raised: string;
  semantic: { readonly [K in keyof typeof tokens.semantic]: string };
  onSemantic: string;
  white: string;
}

export function modeColors(mode: ConsoleMode, accent: ModeAccent): ModeColors {
  const isDark = mode === 'dark';
  const { white, black } = tokens.common;
  const { dark, surface: light } = tokens;

  const primary = isDark
    ? ensureContrast(accent.main, white, [dark.bg, dark.surface, dark.soft, dark.raised])
    : ensureContrast(accent.main, black, [light.paper, light.bg, light.soft]);
  const primaryFill = fillForWhite(accent.main);
  const primaryHover = darkerThan(accent.hover, primaryFill);

  return {
    primary,
    onPrimary: textOn(primary, tokens.neutral[900]),
    primaryFill,
    primaryLight: accent.light,
    primaryHover,
    primaryActive: darkerThan(accent.active, primaryHover),
    ink: isDark ? dark.ink : tokens.neutral[900],
    muted: isDark ? dark.muted : light.muted,
    border: isDark ? dark.border : light.border,
    inputBorder: isDark ? dark.inputBorder : light.inputBorder,
    bg: isDark ? dark.bg : light.bg,
    surface: isDark ? dark.surface : light.paper,
    soft: isDark ? dark.soft : light.soft,
    raised: isDark ? dark.raised : light.raised,
    semantic: isDark ? dark.semantic : tokens.semantic,
    onSemantic: isDark ? tokens.neutral[900] : white,
    white,
  };
}

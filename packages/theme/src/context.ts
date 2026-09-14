import { alpha } from '@mui/material/styles';
import { tokens } from './tokens';
import { darkerThan, ensureContrast, fillForWhite, textOn } from './contrast';
import type { AccentColors, ColorMode, ThemeCtx } from './types';

/**
 * Build the derived theme context from the mode + brand accent. Everything the
 * component overrides need (ink, border, surfaces, gradients) is computed here
 * from `tokens` so no override file hardcodes a value.
 *
 * The accent is made WCAG AA-safe whatever a portal passes: `primary` is the
 * accent as text (darkened on the light grounds, lightened on the dark ones)
 * and `primaryFill` is the accent under white text, with hover and pressed
 * steps that only ever get darker.
 */
export function buildThemeCtx(mode: ColorMode, accent: AccentColors): ThemeCtx {
  const isDark = mode === 'dark';
  const { white, black } = tokens.common;
  const ink = isDark ? tokens.dark.ink : tokens.neutral[900];
  const border = isDark ? tokens.dark.border : tokens.surface.border;
  const bg = isDark ? tokens.dark.bg : tokens.surface.bg;
  const surface = isDark ? tokens.dark.surface : tokens.surface.paper;
  const violet = tokens.semantic.secondary;

  const primary = isDark
    ? ensureContrast(accent.main, white, [tokens.dark.bg, tokens.dark.surface])
    : ensureContrast(accent.main, black, [tokens.surface.paper, tokens.surface.bg, tokens.surface.soft]);
  const primaryFill = fillForWhite(accent.main);
  const primaryHover = darkerThan(accent.hover, primaryFill);
  const primaryActive = darkerThan(accent.active, primaryHover);

  const appBg = isDark
    ? `radial-gradient(circle at 8% 0%, ${alpha(primary, 0.2)}, transparent 34%), radial-gradient(circle at 90% 16%, ${alpha(violet, 0.18)}, transparent 32%), linear-gradient(180deg, ${tokens.dark.gradientFrom} 0%, ${tokens.dark.gradientTo} 100%)`
    : `radial-gradient(circle at 8% 0%, ${alpha(primary, 0.15)}, transparent 34%), radial-gradient(circle at 90% 16%, ${alpha(violet, 0.1)}, transparent 32%), linear-gradient(180deg, ${alpha(primary, 0.05)} 0%, ${white} 62%)`;

  const surfaceGradient = isDark
    ? `linear-gradient(180deg, ${alpha(white, 0.05)} 0%, ${alpha(primary, 0.06)} 100%)`
    : `linear-gradient(180deg, ${white} 0%, ${alpha(primary, 0.035)} 100%)`;

  return {
    mode,
    isDark,
    accent,
    primary,
    onPrimary: textOn(primary, tokens.neutral[900]),
    primaryFill,
    primaryLight: accent.light,
    primaryHover,
    primaryActive,
    ink,
    muted: isDark ? tokens.dark.muted : tokens.surface.muted,
    border,
    inputBorder: isDark ? tokens.dark.inputBorder : tokens.surface.inputBorder,
    bg,
    surface,
    semantic: isDark ? tokens.dark.semantic : tokens.semantic,
    onSemantic: isDark ? tokens.neutral[900] : white,
    appBg,
    surfaceGradient,
    white,
    t: tokens,
  };
}

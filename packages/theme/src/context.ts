import { alpha } from '@mui/material/styles';
import { tokens } from './tokens';
import type { AccentColors, ColorMode, ThemeCtx } from './types';

/**
 * Build the derived theme context from the mode + brand accent. Everything the
 * component overrides need (ink, border, surfaces, gradients) is computed here
 * from `tokens` so no override file hardcodes a value.
 */
export function buildThemeCtx(mode: ColorMode, accent: AccentColors): ThemeCtx {
  const isDark = mode === 'dark';
  const primary = accent.main;
  const ink = isDark ? tokens.dark.ink : tokens.neutral[900];
  const border = isDark ? tokens.dark.border : tokens.surface.border;
  const bg = isDark ? tokens.dark.bg : tokens.surface.bg;
  const surface = isDark ? tokens.dark.surface : tokens.surface.paper;
  const violet = tokens.semantic.secondary;

  const appBg = isDark
    ? `radial-gradient(circle at 8% 0%, ${alpha(primary, 0.2)}, transparent 34%), radial-gradient(circle at 90% 16%, ${alpha(violet, 0.18)}, transparent 32%), linear-gradient(180deg, #100d18 0%, #08070b 100%)`
    : `radial-gradient(circle at 8% 0%, ${alpha(primary, 0.15)}, transparent 34%), radial-gradient(circle at 90% 16%, ${alpha(violet, 0.1)}, transparent 32%), linear-gradient(180deg, ${alpha(primary, 0.05)} 0%, ${tokens.common.white} 62%)`;

  const surfaceGradient = isDark
    ? `linear-gradient(180deg, ${alpha(tokens.common.white, 0.05)} 0%, ${alpha(primary, 0.06)} 100%)`
    : `linear-gradient(180deg, ${tokens.common.white} 0%, ${alpha(primary, 0.035)} 100%)`;

  return {
    mode,
    isDark,
    accent,
    primary,
    primaryLight: accent.light,
    primaryHover: accent.hover,
    primaryActive: accent.active,
    ink,
    muted: isDark ? tokens.dark.muted : tokens.neutral[500],
    border,
    bg,
    surface,
    appBg,
    surfaceGradient,
    white: tokens.common.white,
    t: tokens,
  };
}

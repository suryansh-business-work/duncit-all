import type { ThemeOptions } from '@mui/material/styles';
import type { ThemeCtx } from './types';

/**
 * MUI palette built from the derived context — no literal colours here.
 *
 * `primary.main` is the accent as TEXT for the mode (so `color="primary"`, links,
 * tabs and outlines stay 4.5:1 in dark mode too) and `contrastText` is whatever
 * clears 4.5:1 on it. The design system's own fills — contained buttons, filled
 * chips, selected rows — paint `ctx.primaryFill` under white instead.
 */
export function buildPalette(c: ThemeCtx): ThemeOptions['palette'] {
  const { semantic, onSemantic } = c;
  return {
    mode: c.mode,
    primary: { light: c.primaryLight, main: c.primary, dark: c.primaryActive, contrastText: c.onPrimary },
    secondary: { main: semantic.secondary, contrastText: onSemantic },
    success: { main: semantic.success, contrastText: onSemantic },
    warning: { main: semantic.warning, contrastText: onSemantic },
    error: { main: semantic.error, contrastText: onSemantic },
    info: { main: semantic.info, contrastText: onSemantic },
    accent: { main: c.primary, contrastText: c.onPrimary },
    brand: { main: c.accent.main },
    background: { default: c.bg, paper: c.surface },
    text: { primary: c.ink, secondary: c.muted },
    divider: c.border,
  };
}

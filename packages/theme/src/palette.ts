import type { ThemeOptions } from '@mui/material/styles';
import type { ThemeCtx } from './types';

/** MUI palette built from the derived context — no literal colours here. */
export function buildPalette(c: ThemeCtx): ThemeOptions['palette'] {
  const { t } = c;
  return {
    mode: c.mode,
    primary: { light: c.primaryLight, main: c.primary, dark: c.primaryActive, contrastText: c.white },
    secondary: { main: t.semantic.secondary, contrastText: c.white },
    success: { main: t.semantic.success },
    warning: { main: t.semantic.warning },
    error: { main: t.semantic.error },
    info: { main: t.semantic.info },
    background: { default: c.bg, paper: c.surface },
    text: { primary: c.ink, secondary: c.muted },
    divider: c.border,
  };
}

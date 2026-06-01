import { createTheme, type Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import { buildThemeCtx } from './context';
import { buildPalette } from './palette';
import { buildTypography } from './typography';
import { buildComponents, type ComponentExtend } from './components';
import type { AccentColors, ColorMode } from './types';

/**
 * Build the shared Duncit console theme. Every portal (except mWeb + the public
 * websites) consumes this — only the brand `accent` differs. `extend` lets a
 * single portal add an override that needs its own dependency (e.g. CRM's
 * MuiDataGrid) without polluting the shared package.
 */
export function createDuncitTheme(
  mode: ColorMode = 'light',
  accent: AccentColors = tokens.defaultAccent,
  extend?: ComponentExtend
): Theme {
  const ctx = buildThemeCtx(mode, accent);
  return createTheme({
    palette: buildPalette(ctx),
    shape: { borderRadius: tokens.radius.sm },
    typography: buildTypography(),
    components: buildComponents(ctx, extend),
  });
}

/** Back-compat alias — portals historically import `buildTheme`. */
export const buildTheme = createDuncitTheme;

import { createTheme, type Shadows, type Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import { buildThemeCtx } from './context';
import { buildPalette } from './palette';
import { buildTypography } from './typography';
import { buildComponents, type ComponentExtend } from './components';
import type { AccentColors, ColorMode, ThemeCtx } from './types';

/** MUI's 25 elevation steps, collapsed onto the system's three layers. */
function buildShadows(c: ThemeCtx): Shadows {
  return Array.from({ length: 25 }, (_, step) => {
    if (step === 0) return 'none';
    if (step <= 2) return c.shadow.raised;
    if (step <= 12) return c.shadow.overlay;
    return c.shadow.dialog;
  }) as Shadows;
}

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
  const { motion } = tokens;
  return createTheme({
    palette: buildPalette(ctx),
    shape: { borderRadius: tokens.radius.sm },
    shadows: buildShadows(ctx),
    typography: buildTypography(),
    transitions: {
      easing: { easeOut: motion.ease, easeInOut: motion.ease },
      duration: {
        shortest: motion.fast,
        shorter: motion.fast,
        short: motion.base,
        standard: motion.base,
        complex: motion.slow,
        enteringScreen: motion.base,
        leavingScreen: motion.fast,
      },
    },
    components: buildComponents(ctx, extend),
  });
}

/** Back-compat alias — portals historically import `buildTheme`. */
export const buildTheme = createDuncitTheme;

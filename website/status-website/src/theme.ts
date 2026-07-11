import { createTheme, type Theme } from '@mui/material/styles';
import type { ColorMode } from './hooks/useColorMode';

/** Duncit brand red — replaced at runtime by the admin-configured primary color. */
export const DEFAULT_PRIMARY = '#ff5757';

const FONT_FAMILY = "'Nunito', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

export function buildTheme(mode: ColorMode, primaryColor?: string | null): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: primaryColor || DEFAULT_PRIMARY },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_FAMILY,
      h4: { fontWeight: 800 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
  });
}

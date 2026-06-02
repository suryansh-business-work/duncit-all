/**
 * Theme — delegated to the shared @duncit/theme design system. CRM keeps its
 * own MuiDataGrid override (which needs @mui/x-data-grid) via the theme's
 * `extend` hook; every other colour, font, size and component style comes from
 * @duncit/theme.
 */
import type {} from '@mui/x-data-grid/themeAugmentation';
import { alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { createDuncitTheme, tokens, type AccentColors, type ThemeCtx } from '@duncit/theme';

export { tokens };

const dataGrid = (c: ThemeCtx) => ({
  MuiDataGrid: {
    styleOverrides: {
      root: {
        border: `1px solid ${c.border}`,
        borderRadius: c.t.radius.md,
        backgroundColor: c.surface,
        '--DataGrid-rowBorderColor': c.border,
      },
      columnHeaders: {
        backgroundColor: c.isDark ? alpha(c.ink, 0.04) : c.t.surface.soft,
        borderBottom: `1px solid ${c.border}`,
      },
      cell: { borderBottom: `1px solid ${c.border}` },
    },
  },
});

export const buildTheme = (mode: PaletteMode = 'light', accent?: AccentColors) =>
  createDuncitTheme(mode, accent, dataGrid);

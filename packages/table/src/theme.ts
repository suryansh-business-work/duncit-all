import { themeQuartz } from 'ag-grid-community';
import type { Theme } from '@mui/material/styles';
import type { TableDensity } from './persistence';

/**
 * Maps the live MUI theme into an AG Grid v34 theme (Theming API — zero css imports).
 * Light + dark both work because it reads whatever theme the portal currently renders.
 * Rows auto-size to content, so `density` drives the horizontal squeeze here and the
 * vertical padding via the grid's per-cell style (see DuncitTable) — that pairing is
 * what auto-height rows actually measure.
 */
export function buildAgTheme(muiTheme: Theme, density: TableDensity) {
  return themeQuartz.withParams({
    cellHorizontalPaddingScale: density === 'compact' ? 0.8 : 1,
    accentColor: muiTheme.palette.primary.main,
    backgroundColor: muiTheme.palette.background.paper,
    borderColor: muiTheme.palette.divider,
    borderRadius: muiTheme.shape.borderRadius,
    browserColorScheme: muiTheme.palette.mode,
    fontFamily: muiTheme.typography.fontFamily ?? 'inherit',
    fontSize: muiTheme.typography.fontSize,
    foregroundColor: muiTheme.palette.text.primary,
    headerBackgroundColor: muiTheme.palette.background.paper,
    headerTextColor: muiTheme.palette.text.secondary,
    rowHoverColor: muiTheme.palette.action.hover,
    selectedRowBackgroundColor: muiTheme.palette.action.selected,
    wrapperBorderRadius: muiTheme.shape.borderRadius,
  });
}

import { themeQuartz } from 'ag-grid-community';
import type { Theme } from '@mui/material/styles';

/**
 * Maps the live MUI theme into an AG Grid v34 theme (Theming API — zero css imports).
 * Light + dark both work because it reads whatever theme the portal currently renders.
 */
export function buildAgTheme(muiTheme: Theme) {
  return themeQuartz.withParams({
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

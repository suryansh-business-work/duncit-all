import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tables — compact by default, with a soft header row and token-driven cell
 * borders so every portal's tables read the same.
 */
export const table = (): Components<Theme>['MuiTable'] => ({
  defaultProps: { size: 'small' },
});

export const tableHead = (c: ThemeCtx): Components<Theme>['MuiTableHead'] => ({
  styleOverrides: {
    root: {
      '& .MuiTableCell-head': {
        backgroundColor: c.isDark ? alpha(c.ink, 0.04) : c.t.surface.soft,
        color: c.ink,
        fontWeight: c.t.font.weight.semibold,
      },
    },
  },
});

export const tableCell = (c: ThemeCtx): Components<Theme>['MuiTableCell'] => ({
  styleOverrides: {
    root: { borderBottom: `1px solid ${c.border}` },
  },
});

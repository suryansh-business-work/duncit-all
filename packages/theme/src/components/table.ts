import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tables — compact by default, with a quiet header row and token-driven cell
 * borders so every portal's tables read the same.
 */
export const table = (): Components<Theme>['MuiTable'] => ({
  defaultProps: { size: 'small' },
});

/**
 * The header row.
 *
 * `soft` is an OPAQUE colour, and that is the whole point: a `stickyHeader`
 * table paints its header over the rows scrolling underneath it, so a
 * translucent header let every one of those rows read straight through the
 * column titles. Muted small type keeps the titles out of the data's way while
 * still clearing 4.5:1 on that fill.
 */
export const tableHead = (c: ThemeCtx): Components<Theme>['MuiTableHead'] => ({
  styleOverrides: {
    root: {
      '& .MuiTableCell-head': {
        backgroundColor: c.soft,
        color: c.muted,
        fontSize: c.t.font.size.caption,
        fontWeight: c.t.font.weight.semibold,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      },
    },
  },
});

export const tableCell = (c: ThemeCtx): Components<Theme>['MuiTableCell'] => ({
  styleOverrides: {
    root: { borderBottom: `1px solid ${c.border}` },
    body: { fontSize: c.t.font.size.body2 },
  },
});

export const tableRow = (c: ThemeCtx): Components<Theme>['MuiTableRow'] => ({
  styleOverrides: {
    root: {
      transition: c.transition(['background-color'], c.t.motion.fast),
      '&:last-child > .MuiTableCell-body': { borderBottom: 0 },
    },
  },
});

export const tablePagination = (c: ThemeCtx): Components<Theme>['MuiTablePagination'] => ({
  styleOverrides: {
    root: { borderTop: `1px solid ${c.border}`, color: c.muted },
    selectLabel: { fontSize: c.t.font.size.body2 },
    displayedRows: { fontSize: c.t.font.size.body2 },
  },
});

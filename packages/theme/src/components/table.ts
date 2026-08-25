import { lighten } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tables — compact by default, with a soft header row and token-driven cell
 * borders so every portal's tables read the same.
 */
export const table = (): Components<Theme>['MuiTable'] => ({
  defaultProps: { size: 'small' },
});

/**
 * The header row.
 *
 * The dark tint is an OPAQUE colour, not `alpha(ink, 0.04)`, and that is the
 * whole point: a `stickyHeader` table paints its header over the rows scrolling
 * underneath it, so a 4%-opaque header let every one of those rows read
 * straight through the column titles. It looked identical until something
 * scrolled. Lightening the paper surface by the same 4% is what compositing
 * that tint over the surface was always meant to produce — the colour is
 * unchanged, it just no longer lets anything through.
 */
export const tableHead = (c: ThemeCtx): Components<Theme>['MuiTableHead'] => ({
  styleOverrides: {
    root: {
      '& .MuiTableCell-head': {
        backgroundColor: c.isDark ? lighten(c.surface, 0.04) : c.t.surface.soft,
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

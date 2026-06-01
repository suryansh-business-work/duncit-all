import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * ListItemButton. The selected state wears the accent with white text; hover
 * over a selected item is locked so the contrast never collapses.
 */
export const listItemButton = (c: ThemeCtx): Components<Theme>['MuiListItemButton'] => ({
  styleOverrides: {
    root: {
      borderRadius: c.t.radius.sm,
      '&:hover': { backgroundColor: alpha(c.primary, 0.08) },
      '&.Mui-selected': {
        backgroundColor: c.primary,
        color: c.white,
        '&:hover': { backgroundColor: c.primaryHover, color: c.white },
        '& .MuiListItemIcon-root': { color: 'inherit' },
      },
    },
  },
});

import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * ListItemButton. Hover is a neutral tint. Selected is shown three ways at
 * once — an accent wash, ink text at semibold, and the icon in the accent — so
 * the current row never depends on a colour alone (WCAG 1.4.1).
 */
export const listItemButton = (c: ThemeCtx): Components<Theme>['MuiListItemButton'] => {
  const wash = alpha(c.primary, c.t.state.selected + c.t.state.hover);
  return {
    styleOverrides: {
      root: {
        borderRadius: c.t.radius.sm,
        '&:hover': { backgroundColor: c.hover },
        '&.Mui-selected': {
          backgroundColor: wash,
          color: c.ink,
          '&:hover': { backgroundColor: wash },
          '& .MuiListItemIcon-root': { color: c.primary },
          '& .MuiListItemText-primary': { fontWeight: c.t.font.weight.semibold },
        },
      },
    },
  };
};

export const listItemIcon = (c: ThemeCtx): Components<Theme>['MuiListItemIcon'] => ({
  styleOverrides: {
    root: { color: c.muted, '& .MuiSvgIcon-root': { fontSize: c.t.size.icon.md } },
  },
});

export const listSubheader = (c: ThemeCtx): Components<Theme>['MuiListSubheader'] => ({
  styleOverrides: {
    root: {
      color: c.muted,
      fontSize: c.t.font.size.overline,
      fontWeight: c.t.font.weight.semibold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      lineHeight: 2.6,
      backgroundColor: 'inherit',
    },
  },
});

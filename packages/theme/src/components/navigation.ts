import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Tabs, toggle groups, breadcrumbs and pagination — the controls that move
 * between views. The current one is ink with an accent marker; the rest are
 * muted and brighten on hover.
 */
export const tabs = (c: ThemeCtx): Components<Theme>['MuiTabs'] => ({
  styleOverrides: {
    root: { minHeight: c.t.size.controlLg },
    indicator: { height: c.t.size.indicator, borderRadius: c.t.size.indicator, backgroundColor: c.primary },
  },
});

export const tab = (c: ThemeCtx): Components<Theme>['MuiTab'] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: c.t.size.controlLg,
      minWidth: 0,
      padding: theme.spacing(1, 1.5),
      fontSize: c.t.font.size.body2,
      fontWeight: c.t.font.weight.medium,
      textTransform: 'none',
      color: c.muted,
      '&:hover': { color: c.ink },
      '&.Mui-selected': { color: c.ink },
      '& .MuiSvgIcon-root': { fontSize: c.t.size.icon.md },
    }),
  },
});

export const toggleButton = (c: ThemeCtx): Components<Theme>['MuiToggleButton'] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      borderColor: c.border,
      borderRadius: c.t.radius.sm,
      color: c.muted,
      fontSize: c.t.font.size.body2,
      fontWeight: c.t.font.weight.medium,
      textTransform: 'none',
      padding: theme.spacing(0.5, 1.25),
      '&:hover': { backgroundColor: c.hover, color: c.ink },
      '&.Mui-selected': {
        backgroundColor: c.selected,
        color: c.ink,
        '&:hover': { backgroundColor: c.selected },
      },
    }),
  },
});

export const breadcrumbs = (c: ThemeCtx): Components<Theme>['MuiBreadcrumbs'] => ({
  styleOverrides: {
    root: { fontSize: c.t.font.size.body2 },
    separator: { color: c.muted },
  },
});

export const paginationItem = (c: ThemeCtx): Components<Theme>['MuiPaginationItem'] => ({
  styleOverrides: {
    root: { borderRadius: c.t.radius.sm, fontSize: c.t.font.size.body2 },
  },
});

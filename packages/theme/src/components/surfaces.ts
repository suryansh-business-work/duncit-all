import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** AppBar, Paper, Card, Dialog and Divider — the surface family. */
export const appBar = (c: ThemeCtx): Components<Theme>['MuiAppBar'] => ({
  defaultProps: { elevation: 0, color: 'default' },
  styleOverrides: {
    root: { backgroundColor: c.surface, color: c.ink, borderBottom: `1px solid ${c.border}` },
  },
});

export const paper = (c: ThemeCtx): Components<Theme>['MuiPaper'] => ({
  defaultProps: { elevation: 0 },
  styleOverrides: {
    rounded: { borderRadius: c.t.radius.md },
    outlined: { borderColor: c.border },
  },
});

export const card = (c: ThemeCtx): Components<Theme>['MuiCard'] => ({
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: {
      borderRadius: c.t.radius.md,
      border: `1px solid ${c.border}`,
      backgroundColor: c.surface,
      backgroundImage: c.surfaceGradient,
      boxShadow: `0 14px 34px -22px ${alpha(c.ink, c.isDark ? 0.72 : 0.28)}`,
      transition: 'transform 180ms ease, box-shadow 180ms ease',
      '&:hover': { boxShadow: `0 18px 42px -24px ${alpha(c.primary, 0.34)}` },
    },
  },
});

export const dialog = (c: ThemeCtx): Components<Theme>['MuiDialog'] => ({
  styleOverrides: { paper: { borderRadius: c.t.radius.lg, backgroundImage: c.surfaceGradient } },
});

export const divider = (c: ThemeCtx): Components<Theme>['MuiDivider'] => ({
  styleOverrides: { root: { borderColor: c.border } },
});

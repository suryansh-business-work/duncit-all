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
  styleOverrides: {
    paper: { borderRadius: c.t.radius.lg, backgroundImage: c.surfaceGradient },
    // `paper` is composed AFTER MUI's own `paperFullScreen`, so without this a
    // fullScreen dialog keeps rounded corners against the backdrop — and since
    // the paper also carries `overflowY: auto`, its content is clipped at them.
    paperFullScreen: { borderRadius: 0 },
  },
});

/**
 * Every dropdown, capped.
 *
 * MUI caps a Menu at `calc(100% - 96px)` where 100% is the LARGE viewport — a
 * Menu is a portalled Popover on document.body, so it can never be clipped by
 * the dialog that opened it, and on a narrow window a long option list runs
 * across the whole screen. Below the `sm` breakpoint MenuItem also has a hard
 * `minHeight: 48`, so the cap engages even later there. `dvh` tracks a mobile
 * browser's collapsible toolbar; 336px is ~7 rows, which reads as a list rather
 * than a takeover.
 *
 * Kept word-for-word in sync with app/mweb/src/theme.ts — mWeb does not consume
 * this package (it has its own theme), so the two carry the same rule twice.
 */
export const menu = (): Components<Theme>['MuiMenu'] => ({
  styleOverrides: { paper: { maxHeight: 'min(calc(100% - 96px), 45dvh, 336px)' } },
});

/** The Autocomplete popup is a Popper, so the Menu cap above misses it. MUI's
 * own `40vh` is the large viewport and does not shrink for the keyboard — and
 * an Autocomplete always has focus. */
export const autocomplete = (): Components<Theme>['MuiAutocomplete'] => ({
  styleOverrides: { listbox: { maxHeight: 'min(40dvh, 320px)' } },
});

export const divider = (c: ThemeCtx): Components<Theme>['MuiDivider'] => ({
  styleOverrides: { root: { borderColor: c.border } },
});

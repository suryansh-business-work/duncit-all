import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * AppBar, Paper, Card and Divider — the in-page surface family.
 *
 * Flat by design: a card is the content surface with a hairline edge, never a
 * gradient and never a shadow. Elevation is reserved for what floats (see
 * `overlays.ts`), so depth on a page always means "this is on top".
 */
export const appBar = (c: ThemeCtx): Components<Theme>['MuiAppBar'] => ({
  defaultProps: { elevation: 0, color: 'default' },
  styleOverrides: {
    root: {
      backgroundColor: c.surface,
      backgroundImage: 'none',
      color: c.ink,
      borderBottom: `1px solid ${c.border}`,
    },
  },
});

export const paper = (c: ThemeCtx): Components<Theme>['MuiPaper'] => ({
  defaultProps: { elevation: 0 },
  styleOverrides: {
    // MUI lightens an elevated dark paper with a white overlay image; the
    // system's surfaces already carry their own step, so it is switched off.
    root: { backgroundImage: 'none' },
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
      backgroundImage: 'none',
      boxShadow: 'none',
      transition: c.transition(['border-color', 'background-color']),
    },
  },
});

/** Only a card that IS a control answers the pointer. */
export const cardActionArea = (c: ThemeCtx): Components<Theme>['MuiCardActionArea'] => ({
  styleOverrides: {
    root: { '&:hover': { backgroundColor: c.hover } },
    focusHighlight: { backgroundColor: 'transparent' },
  },
});

export const cardHeader = (c: ThemeCtx): Components<Theme>['MuiCardHeader'] => ({
  styleOverrides: {
    title: { fontSize: c.t.font.size.subtitle1, fontWeight: c.t.font.weight.semibold },
    subheader: { fontSize: c.t.font.size.body2, color: c.muted },
  },
});

export const divider = (c: ThemeCtx): Components<Theme>['MuiDivider'] => ({
  styleOverrides: { root: { borderColor: c.border } },
});

/**
 * Flat disclosure rows: no floating shadow. Borders and gutters stay whatever
 * the call site chose — stacked and standalone accordions both exist.
 */
export const accordion = (c: ThemeCtx): Components<Theme>['MuiAccordion'] => ({
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: {
      backgroundColor: c.surface,
      '&::before': { backgroundColor: c.border },
    },
  },
});

export const accordionSummary = (c: ThemeCtx): Components<Theme>['MuiAccordionSummary'] => ({
  styleOverrides: {
    root: {
      minHeight: c.t.size.controlLg + 4,
      fontWeight: c.t.font.weight.medium,
      '&:hover': { backgroundColor: c.hover },
    },
    expandIconWrapper: { color: c.muted },
  },
});

import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** Button + IconButton. Primary states come from the portal accent. */
export const button = (c: ThemeCtx): Components<Theme>['MuiButton'] => ({
  defaultProps: { disableElevation: true },
  styleOverrides: {
    root: {
      borderRadius: c.t.radius.sm,
      paddingInline: c.t.size.buttonPadX,
      paddingBlock: c.t.size.buttonPadY,
      fontWeight: c.t.font.weight.medium,
      lineHeight: 1.1,
      minWidth: 0,
      whiteSpace: 'nowrap',
    },
    sizeLarge: {
      paddingInline: c.t.size.buttonLgPadX,
      paddingBlock: c.t.size.buttonLgPadY,
      fontSize: c.t.font.size.buttonLg,
    },
    containedPrimary: {
      backgroundColor: c.primary,
      color: c.white,
      '&:hover': { backgroundColor: c.primaryHover },
      '&:active': { backgroundColor: c.primaryActive },
    },
    outlinedPrimary: {
      borderColor: c.primary,
      color: c.primary,
      '&:hover': { borderColor: c.primaryHover, backgroundColor: alpha(c.primary, 0.06) },
    },
  },
});

export const iconButton = (c: ThemeCtx): Components<Theme>['MuiIconButton'] => ({
  styleOverrides: { root: { borderRadius: c.t.radius.sm } },
});

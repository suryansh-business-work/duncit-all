import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** Alerts (soft tinted backgrounds) + Avatar weight. */
export const alert = (c: ThemeCtx): Components<Theme>['MuiAlert'] => ({
  styleOverrides: {
    root: { borderRadius: c.t.radius.md, border: `1px solid ${c.border}` },
  },
  // MUI 9 removed the `standard<Severity>` slots; the same four tints are now
  // keyed off the variant + severity pair the component actually renders with.
  variants: [
    {
      props: { variant: 'standard', severity: 'info' },
      style: { backgroundColor: alpha(c.t.semantic.info, 0.1), color: c.ink },
    },
    {
      props: { variant: 'standard', severity: 'success' },
      style: { backgroundColor: alpha(c.t.semantic.success, 0.12), color: c.ink },
    },
    {
      props: { variant: 'standard', severity: 'warning' },
      style: { backgroundColor: alpha(c.t.semantic.warning, 0.14), color: c.ink },
    },
    {
      props: { variant: 'standard', severity: 'error' },
      style: { backgroundColor: alpha(c.t.semantic.error, 0.12), color: c.ink },
    },
  ],
});

export const avatar = (c: ThemeCtx): Components<Theme>['MuiAvatar'] => ({
  styleOverrides: { root: { fontWeight: c.t.font.weight.semibold } },
});

import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/** Global resets: app background, scrollbars, focus rings, coarse-pointer hit areas. */
export const cssBaseline = (c: ThemeCtx): Components<Theme>['MuiCssBaseline'] => ({
  styleOverrides: {
    html: { width: '100%', overflowX: 'hidden' },
    body: {
      backgroundColor: c.bg,
      backgroundImage: c.appBg,
      backgroundAttachment: 'fixed',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      position: 'relative',
      overflowX: 'hidden',
      width: '100%',
    },
    '#root': { width: '100%', minHeight: '100dvh' },
    '*::-webkit-scrollbar': { width: c.t.size.scrollbar, height: c.t.size.scrollbar },
    '*::-webkit-scrollbar-thumb': { background: alpha(c.ink, 0.18), borderRadius: c.t.size.scrollbar },
    '*::-webkit-scrollbar-thumb:hover': { background: alpha(c.ink, 0.28) },
    'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, [tabindex="0"]:focus-visible': {
      outline: `2px solid ${c.primary}`,
      outlineOffset: 2,
      borderRadius: c.t.radius.xs,
    },
    '@media (pointer: coarse)': {
      'button, a[role="button"], [role="button"]': { minHeight: c.t.size.touchTarget },
    },
  },
});

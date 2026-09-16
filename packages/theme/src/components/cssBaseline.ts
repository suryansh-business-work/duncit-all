import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import { focusVisibleGlobalCss, reducedMotionGlobalCss } from '@duncit/buttons';
import type { ThemeCtx } from '../types';

/**
 * Global resets: a flat app ground, native controls in the right colour
 * scheme, quiet scrollbars, the keyboard focus ring (in the AA accent, 4.5:1 on
 * the page in both modes), reduced motion and coarse-pointer hit areas.
 */
export const cssBaseline = (c: ThemeCtx): Components<Theme>['MuiCssBaseline'] => {
  const thumb = alpha(c.ink, 0.2);
  return {
    styleOverrides: {
      html: {
        width: '100%',
        overflowX: 'hidden',
        // Date inputs, native selects and form autofill follow the mode.
        colorScheme: c.mode,
        textRendering: 'optimizeLegibility',
      },
      body: {
        backgroundColor: c.bg,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        position: 'relative',
        overflowX: 'hidden',
        width: '100%',
      },
      '#root': { width: '100%', minHeight: '100dvh' },
      '::selection': { backgroundColor: alpha(c.primary, c.t.state.ring) },
      'code, kbd, pre, samp': { fontFamily: c.t.font.mono },
      // Firefox + Chromium: a thin thumb on a clear track.
      '*': { scrollbarWidth: 'thin', scrollbarColor: `${thumb} transparent` },
      // Safari still reads only the prefixed parts.
      '*::-webkit-scrollbar': { width: c.t.size.scrollbar, height: c.t.size.scrollbar },
      '*::-webkit-scrollbar-track': { background: 'transparent' },
      '*::-webkit-scrollbar-thumb': {
        background: thumb,
        borderRadius: c.t.size.scrollbar,
        border: `2px solid ${c.bg}`,
      },
      '*::-webkit-scrollbar-thumb:hover': { background: alpha(c.ink, 0.32) },
      ...focusVisibleGlobalCss(c.primary),
      ...reducedMotionGlobalCss,
      '@media (pointer: coarse)': {
        'button, a[role="button"], [role="button"]': { minHeight: c.t.size.touchTarget },
      },
    },
  };
};

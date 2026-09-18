import { createTheme, type Theme } from '@mui/material/styles';
import { light } from '@duncit/auth-tokens';
import { focusVisibleGlobalCss, reducedMotionGlobalCss, withPress } from '@duncit/buttons';

import { STORE_TOKENS as T } from './tokens';

const FONT_STACK = '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/**
 * The store's MUI theme. `primary` is the 4.8:1 call-to-action red, so every
 * contained button and filled chip with ordinary-size white text is readable;
 * the brighter brand red is reserved for fills without small text (see tokens).
 * Controls are pills, cards are 24px, and the page sits on a light grey.
 */
export function buildStoreTheme(): Theme {
  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: T.cta, dark: light.primaryActive, contrastText: T.onBrand },
      secondary: { main: light.accent, contrastText: light.onAccent },
      success: { main: light.success, contrastText: light.onSemantic },
      warning: { main: light.warning, contrastText: light.onSemantic },
      error: { main: light.error, contrastText: light.onSemantic },
      info: { main: light.info, contrastText: light.onSemantic },
      background: { default: T.page, paper: T.surface },
      text: { primary: T.ink, secondary: T.muted },
      divider: T.border,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: FONT_STACK,
      h1: { fontWeight: 800, fontSize: '2.25rem', lineHeight: 1.15 },
      h2: { fontWeight: 800, fontSize: '1.6rem' },
      h3: { fontWeight: 800, fontSize: '1.25rem' },
      h4: { fontWeight: 700, fontSize: '1.1rem' },
      h5: { fontWeight: 700, fontSize: '1rem' },
      h6: { fontWeight: 700, fontSize: '0.95rem' },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    components: withPress({
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: T.page },
          ...focusVisibleGlobalCss(light.accent),
          ...reducedMotionGlobalCss,
          '@media (pointer: coarse)': {
            'button, a[role="button"], [role="button"]': { minHeight: 44 },
          },
        },
      },
      MuiButton: {
        styleOverrides: { root: { borderRadius: T.radius.pill, paddingInline: 20, minHeight: 44 } },
      },
      MuiToggleButton: {
        styleOverrides: { root: { borderRadius: T.radius.pill, textTransform: 'none', fontWeight: 700 } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: T.radius.pill, fontWeight: 700 } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: T.radius.pill, backgroundColor: T.surface },
          multiline: { borderRadius: T.radius.panel },
          notchedOutline: { borderColor: T.inputBorder },
        },
      },
      MuiLink: { defaultProps: { color: 'secondary', underline: 'hover' } },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { rounded: { borderRadius: T.radius.card } },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: T.radius.card, boxShadow: T.shadow } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: T.radius.card } },
      },
    }, { ink: T.ink, accent: light.accent }),
  });
}

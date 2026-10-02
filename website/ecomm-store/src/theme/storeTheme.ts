import { createTheme, responsiveFontSizes, type Theme } from '@mui/material/styles';
import { dark, light } from '@duncit/auth-tokens';
import { focusVisibleGlobalCss, reducedMotionGlobalCss, withPress } from '@duncit/buttons';

import { STORE_PALETTES, STORE_TOKENS as T, storeCssVars, type StoreColorMode } from './tokens';

const FONT_STACK = '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/**
 * The store's MUI theme for one colour mode. `primary` is the 4.8:1
 * call-to-action red, so every contained button and filled chip with
 * ordinary-size white text is readable; the brighter brand red is reserved for
 * fills without small text (see tokens). Controls are pills, cards are 24px.
 * The palette takes real colours (press states mix them); the `--store-*`
 * variables that `STORE_TOKENS` reads are declared on `:root` for the mode.
 */
export function buildStoreTheme(mode: StoreColorMode): Theme {
  const modeColors = mode === 'dark' ? dark : light;
  const C = STORE_PALETTES[mode];
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: C.cta, dark: modeColors.primaryActive, contrastText: C.onBrand },
      secondary: { main: modeColors.accent, contrastText: modeColors.onAccent },
      success: { main: modeColors.success, contrastText: modeColors.onSemantic },
      warning: { main: modeColors.warning, contrastText: modeColors.onSemantic },
      error: { main: modeColors.error, contrastText: modeColors.onSemantic },
      info: { main: modeColors.info, contrastText: modeColors.onSemantic },
      background: { default: C.page, paper: C.surface },
      text: { primary: C.ink, secondary: C.muted },
      divider: C.border,
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
          ':root': storeCssVars(mode),
          body: { backgroundColor: C.page, overflowWrap: 'break-word' },
          ...focusVisibleGlobalCss(modeColors.accent),
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
          root: { borderRadius: T.radius.pill, backgroundColor: C.surface },
          multiline: { borderRadius: T.radius.panel },
          notchedOutline: { borderColor: C.inputBorder },
        },
      },
      MuiLink: { defaultProps: { color: 'secondary', underline: 'hover' } },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { rounded: { borderRadius: T.radius.card } },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: T.radius.card, boxShadow: C.shadow } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: T.radius.card } },
      },
    }, { ink: C.ink, accent: modeColors.accent }),
  });
  // Headings step down on phones so a long title doesn't fill the screen.
  return responsiveFontSizes(theme);
}

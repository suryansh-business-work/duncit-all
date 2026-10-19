import { createTheme, responsiveFontSizes, type Theme } from '@mui/material/styles';
import { dark, light } from '@duncit/auth-tokens';
import { focusVisibleGlobalCss, reducedMotionGlobalCss, withPress } from '@duncit/buttons';

import { STORE_PALETTES, STORE_TOKENS as T, storeCssVars, type StoreColorMode, type StorePalette } from './tokens';

/** Plus Jakarta Sans (variable, self-hosted) for everything: heavy geometric headings, warm body. */
const FONT_STACK = '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
/** The readable-font preference swaps in the platform's own UI face. */
const SYSTEM_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/** The shopper's accessibility choices that change how the theme paints. */
export interface StoreThemePrefs {
  /** 1 = the default size; the html font size scales every rem. */
  textScale: number;
  underlineLinks: boolean;
  reduceMotion: boolean;
  readableFont: boolean;
}

export const DEFAULT_THEME_PREFS: StoreThemePrefs = { textScale: 1, underlineLinks: false, reduceMotion: false, readableFont: false };

/** Kill every transition and animation, as the OS-level reduced-motion query does. */
const FORCED_STILL = {
  '*, *::before, *::after': {
    animationDuration: '0.01ms !important',
    animationIterationCount: '1 !important',
    transitionDuration: '0.01ms !important',
    scrollBehavior: 'auto !important',
  },
} as const;

/**
 * The store's MUI theme for one colour mode and palette (the house palette, or
 * an occasion's look laid over it). `primary` is the 4.8:1 call-to-action red,
 * so every contained button and filled chip with ordinary-size white text is
 * readable; the brighter brand red is reserved for fills without small text.
 * The `--store-*` variables `STORE_TOKENS` reads are declared on `:root`.
 */
export function buildStoreTheme(
  mode: StoreColorMode,
  palette: StorePalette = STORE_PALETTES[mode],
  prefs: StoreThemePrefs = DEFAULT_THEME_PREFS,
): Theme {
  const modeColors = mode === 'dark' ? dark : light;
  const C = palette;
  const fontFamily = prefs.readableFont ? SYSTEM_STACK : FONT_STACK;
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: C.cta, dark: C.ctaActive, contrastText: C.onBrand },
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
      fontFamily,
      fontWeightRegular: 500,
      h1: { fontWeight: 800, fontSize: '3.25rem', lineHeight: 1.05, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.2, letterSpacing: '-0.01em' },
      h3: { fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.25 },
      h4: { fontWeight: 800, fontSize: '1.15rem' },
      h5: { fontWeight: 700, fontSize: '1rem' },
      h6: { fontWeight: 700, fontSize: '0.95rem' },
      overline: { fontWeight: 800, letterSpacing: '0.24em', lineHeight: 1.6 },
      button: { fontWeight: 800, textTransform: 'none', letterSpacing: 0 },
    },
    components: withPress({
      MuiCssBaseline: {
        styleOverrides: {
          ':root': storeCssVars(C),
          html: { fontSize: `${prefs.textScale * 100}%` },
          body: { backgroundColor: C.page, overflowWrap: 'break-word', WebkitFontSmoothing: 'antialiased' },
          ...(prefs.underlineLinks ? { a: { textDecoration: 'underline !important' } } : {}),
          ...focusVisibleGlobalCss(modeColors.accent),
          ...reducedMotionGlobalCss,
          ...(prefs.reduceMotion ? FORCED_STILL : {}),
          '@media (pointer: coarse)': {
            'button, a[role="button"], [role="button"]': { minHeight: 44 },
          },
        },
      },
      MuiButton: {
        styleOverrides: { root: { borderRadius: T.radius.pill, paddingInline: 22, minHeight: 44 } },
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
      MuiLink: { defaultProps: { color: 'secondary', underline: prefs.underlineLinks ? 'always' : 'hover' } },
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
  return responsiveFontSizes(theme, { factor: 2.4 });
}

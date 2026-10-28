import { alpha, createTheme, type Theme } from '@mui/material/styles';
import { focusVisibleGlobalCss, reducedMotionGlobalCss, withPress } from '@duncit/buttons';
import { LITE_MOTION, LITE_RADII, LITE_SCHEMES, type LiteSchemeTokens } from './tokens';

export { tintAt } from './tokens';

const FONT_STACK = '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/** The attribute the colour scheme rides on (`<html data-lite-mode="dark">`), set before first paint. */
export const COLOR_SCHEME_ATTRIBUTE = 'data-lite-mode';
export const COLOR_SCHEME_SELECTOR = `[${COLOR_SCHEME_ATTRIBUTE}="%s"]`;
/** Where the reader's Light / Dark / System choice is remembered on this device. */
export const MODE_STORAGE_KEY = 'lite_display_mode';

const palette = (s: LiteSchemeTokens) => ({
  primary: { main: s.cta, contrastText: s.onCta },
  secondary: { main: s.accent, contrastText: s.onCta },
  success: { main: s.success, contrastText: s.onSemantic },
  warning: { main: s.warning, contrastText: s.onSemantic },
  error: { main: s.error, contrastText: s.onSemantic },
  info: { main: s.info, contrastText: s.onSemantic },
  background: { default: s.page, paper: s.surface },
  text: { primary: s.ink, secondary: s.muted },
  divider: s.border,
  lite: s,
});

/** The keyframes every animated surface shares; each is switched off under reduced motion. */
const KEYFRAMES = {
  '@keyframes lite-rise': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes lite-float': {
    '0%, 100%': { transform: 'translateY(0) rotate(var(--lite-tilt, 0deg))' },
    '50%': { transform: 'translateY(-14px) rotate(var(--lite-tilt, 0deg))' },
  },
  '@keyframes lite-fade': { from: { opacity: 0 }, to: { opacity: 1 } },
};

/**
 * The web app's MUI theme: both colour schemes as CSS variables, so switching
 * Light / Dark / System (or rendering on the server without knowing the
 * reader's preference) never re-renders a different tree. The console uses
 * `DuncitThemeProvider` from @duncit/theme instead.
 */
export function buildLiteTheme(): Theme {
  const card = LITE_RADII.card;
  return createTheme({
    cssVariables: { colorSchemeSelector: COLOR_SCHEME_SELECTOR, cssVarPrefix: 'lite' },
    colorSchemes: { dark: { palette: palette(LITE_SCHEMES.dark) }, light: { palette: palette(LITE_SCHEMES.light) } },
    defaultColorScheme: 'dark',
    shape: { borderRadius: LITE_RADII.control },
    typography: {
      fontFamily: FONT_STACK,
      h1: { fontWeight: 800, fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1.05, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.01em' },
      h3: { fontWeight: 800, fontSize: '1.25rem' },
      h4: { fontWeight: 700, fontSize: '1.1rem' },
      h5: { fontWeight: 700, fontSize: '1rem' },
      h6: { fontWeight: 700, fontSize: '0.95rem' },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    transitions: { easing: { easeInOut: LITE_MOTION.ease, easeOut: LITE_MOTION.ease } },
    components: withPress(
      {
        MuiCssBaseline: {
          styleOverrides: (theme: Theme) => ({
            ...KEYFRAMES,
            body: { backgroundColor: theme.vars?.palette.background.default, colorScheme: 'light dark' },
            ...focusVisibleGlobalCss(LITE_SCHEMES.dark.accent),
            ...reducedMotionGlobalCss,
            // One control height on a touch screen too: buttons and single-line inputs both grow to 44.
            '@media (pointer: coarse)': { 'button, a[role="button"], [role="button"]': { minHeight: 44 }, '.MuiInputBase-root:not(.MuiInputBase-multiline)': { minHeight: 44 } },
            '@media (prefers-reduced-motion: reduce)': { '[data-lite-animate]': { animation: 'none !important' } },
          }),
        },
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: LITE_RADII.control, paddingInline: 16, minHeight: 40, transition: `transform ${LITE_MOTION.fast}ms ${LITE_MOTION.ease}, background-color ${LITE_MOTION.fast}ms` },
          },
        },
        MuiToggleButton: { styleOverrides: { root: { borderRadius: LITE_RADII.control, textTransform: 'none', fontWeight: 700 } } },
        MuiChip: { styleOverrides: { root: { borderRadius: LITE_RADII.pill, fontWeight: 700 } } },
        MuiOutlinedInput: { styleOverrides: { root: { borderRadius: LITE_RADII.control } } },
        // Inputs default to the small (40px) size so a box and the button beside it line up everywhere.
        MuiTextField: { defaultProps: { size: 'small' } },
        MuiFormControl: { defaultProps: { size: 'small' } },
        MuiAutocomplete: { defaultProps: { size: 'small' } },
        MuiCard: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: card,
              backgroundImage: 'none',
              boxShadow: 'none',
              border: `1px solid ${theme.vars?.palette.divider}`,
              transition: `transform ${LITE_MOTION.base}ms ${LITE_MOTION.ease}, border-color ${LITE_MOTION.base}ms`,
            }),
          },
        },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: card } } },
        MuiDialog: {
          styleOverrides: {
            paper: ({ theme }) => ({ borderRadius: LITE_RADII.cover, border: `1px solid ${theme.vars?.palette.divider}` }),
            root: { '& .MuiBackdrop-root': { backdropFilter: 'blur(6px)' } },
          },
        },
        MuiTooltip: { styleOverrides: { tooltip: { borderRadius: LITE_RADII.control } } },
      },
      { ink: LITE_SCHEMES.dark.ink, accent: LITE_SCHEMES.dark.accent },
    ),
  });
}

/** A translucent version of a token colour, for glows and tints. */
export const tint = (color: string, opacity: number): string => alpha(color, opacity);

declare module '@mui/material/styles' {
  interface Palette {
    lite: LiteSchemeTokens;
  }
  interface PaletteOptions {
    lite?: LiteSchemeTokens;
  }
}

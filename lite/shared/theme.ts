import { createTheme, type Theme } from '@mui/material/styles';
import { light, radii } from '@duncit/auth-tokens';
import { focusVisibleGlobalCss, reducedMotionGlobalCss, withPress } from '@duncit/buttons';

const FONT_STACK = '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/** Lite's visual language: the Duncit red CTA on a light page, rounded cards, pill controls. */
export const LITE_TOKENS = {
  cta: light.primary,
  ctaHover: light.primaryHover,
  onBrand: light.onPrimary,
  ink: light.ink,
  muted: light.muted,
  page: '#F6F6F8',
  surface: light.surface,
  border: light.border,
  inputBorder: light.inputBorder,
  brandTint: '#FFE9E9',
  radius: { card: radii.xl, pill: radii.pill, control: radii.lg },
  shadow: '0 8px 24px rgba(21, 21, 21, 0.06)',
} as const;

/** Soft tints rotated across cards so a grid never reads as one flat block. */
const CARD_TINTS = ['#FFE9E9', '#FFEEDD', '#F1EAFF', '#E7F2FF', '#E5F7EE'] as const;
export const tintAt = (position: number): string => CARD_TINTS[position % CARD_TINTS.length];

/** The web app's MUI theme. The console uses `DuncitThemeProvider` from @duncit/theme instead. */
export function buildLiteTheme(): Theme {
  const T = LITE_TOKENS;
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
          '@media (pointer: coarse)': { 'button, a[role="button"], [role="button"]': { minHeight: 44 } },
        },
      },
      MuiButton: { styleOverrides: { root: { borderRadius: T.radius.pill, paddingInline: 20, minHeight: 44 } } },
      MuiToggleButton: { styleOverrides: { root: { borderRadius: T.radius.pill, textTransform: 'none', fontWeight: 700 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: T.radius.pill, fontWeight: 700 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: T.radius.control, backgroundColor: T.surface },
          notchedOutline: { borderColor: T.inputBorder },
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: T.radius.card, boxShadow: T.shadow, border: `1px solid ${T.border}` } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: T.radius.card } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: T.radius.card } } },
    }, { ink: T.ink, accent: light.accent }),
  });
}

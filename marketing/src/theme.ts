import { createTheme, alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import type { AccentColors } from './config/app-config';

// Design-system tokens — keep colors and shape decisions here so every
// component picks them up via MUI styled().
export const tokens = {
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
  },
  surface: {
    bg: '#f8fafc',
    paper: '#ffffff',
    soft: '#f1f5f9',
    border: '#e5e7eb',
  },
};

const DEFAULT_ACCENT: AccentColors = { light: '#ff9e9e', main: '#ff5757', hover: '#f03e3e', active: '#d92d2d' };

export const buildTheme = (mode: PaletteMode = 'light', accent: AccentColors = DEFAULT_ACCENT) => {
  const PRIMARY = accent.main;
  const PRIMARY_HOVER = accent.hover;
  const PRIMARY_ACTIVE = accent.active;
  const isDark = mode === 'dark';
  const INK = isDark ? '#f4f6fb' : tokens.neutral[900];
  const MUTED = isDark ? '#9aa3b2' : tokens.neutral[500];
  const BORDER = isDark ? 'rgba(255,255,255,0.10)' : tokens.surface.border;
  const BG = isDark ? '#0b1220' : tokens.surface.bg;
  const SURFACE = isDark ? '#111a2e' : tokens.surface.paper;
  const APP_BG = isDark
    ? `radial-gradient(circle at 8% 0%, ${alpha(PRIMARY, 0.2)}, transparent 34%), radial-gradient(circle at 90% 16%, rgba(139,92,246,0.18), transparent 32%), linear-gradient(180deg, #100d18 0%, #08070b 100%)`
    : `radial-gradient(circle at 8% 0%, ${alpha(PRIMARY, 0.15)}, transparent 34%), radial-gradient(circle at 90% 16%, rgba(139,92,246,0.10), transparent 32%), linear-gradient(180deg, ${alpha(PRIMARY, 0.05)} 0%, #ffffff 62%)`;
  const SURFACE_GRADIENT = isDark
    ? `linear-gradient(180deg, ${alpha('#ffffff', 0.05)} 0%, ${alpha(PRIMARY, 0.06)} 100%)`
    : `linear-gradient(180deg, #ffffff 0%, ${alpha(PRIMARY, 0.035)} 100%)`;
  return createTheme({
    palette: {
      mode,
      primary: { light: accent.light, main: PRIMARY, dark: PRIMARY_ACTIVE, contrastText: '#ffffff' },
      secondary: { main: tokens.semantic.secondary, contrastText: '#ffffff' },
      success: { main: tokens.semantic.success },
      warning: { main: tokens.semantic.warning },
      error: { main: tokens.semantic.error },
      info: { main: tokens.semantic.info },
      background: { default: BG, paper: SURFACE },
      text: { primary: INK, secondary: MUTED },
      divider: BORDER,
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily:
        '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600, lineHeight: 1.3 },
      subtitle2: { fontWeight: 600, lineHeight: 1.3 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
      body1: { fontSize: '0.95rem', lineHeight: 1.4 },
      body2: { fontSize: '0.875rem', lineHeight: 1.4 },
      caption: { fontSize: '0.75rem', lineHeight: 1.35 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { width: '100%', overflowX: 'hidden' },
          body: {
            backgroundColor: BG,
            backgroundImage: APP_BG,
            backgroundAttachment: 'fixed',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            position: 'relative',
            overflowX: 'hidden',
            width: '100%',
          },
          '#root': { width: '100%', minHeight: '100dvh' },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': { background: alpha(INK, 0.18), borderRadius: 8 },
          '*::-webkit-scrollbar-thumb:hover': { background: alpha(INK, 0.28) },
          'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, [tabindex="0"]:focus-visible': {
            outline: `2px solid ${PRIMARY}`,
            outlineOffset: 2,
            borderRadius: 4,
          },
          '@media (pointer: coarse)': {
            'button, a[role="button"], [role="button"]': { minHeight: 44 },
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: { backgroundColor: SURFACE, color: INK, borderBottom: `1px solid ${BORDER}` },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { rounded: { borderRadius: 8 }, outlined: { borderColor: BORDER } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            backgroundColor: SURFACE,
            backgroundImage: SURFACE_GRADIENT,
            boxShadow: `0 14px 34px -22px ${alpha(INK, isDark ? 0.72 : 0.28)}`,
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            '&:hover': { boxShadow: `0 18px 42px -24px ${alpha(PRIMARY, 0.34)}` },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 6, paddingInline: 18, paddingBlock: 9, fontWeight: 600, lineHeight: 1.1, minWidth: 0, whiteSpace: 'nowrap' },
          sizeLarge: { paddingInline: 20, paddingBlock: 11, fontSize: '0.92rem' },
          containedPrimary: {
            backgroundColor: PRIMARY,
            color: '#ffffff',
            '&:hover': { backgroundColor: PRIMARY_HOVER },
            '&:active': { backgroundColor: PRIMARY_ACTIVE },
          },
          outlinedPrimary: {
            borderColor: PRIMARY,
            color: PRIMARY,
            '&:hover': { borderColor: PRIMARY_HOVER, backgroundColor: alpha(PRIMARY, 0.06) },
          },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 6 } } },
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600, height: 30, paddingInline: 6 },
          outlined: { borderColor: BORDER, backgroundColor: SURFACE },
          filledPrimary: { backgroundColor: PRIMARY, color: '#ffffff' },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
      MuiFormHelperText: {
        styleOverrides: { root: { marginTop: 5, lineHeight: 1.35, minHeight: '1.35em', overflowWrap: 'anywhere' } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: SURFACE,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: alpha(INK, 0.3) },
            '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, border: `1px solid ${BORDER}` },
          standardInfo: { backgroundColor: alpha(tokens.semantic.info, 0.1), color: INK },
          standardSuccess: { backgroundColor: alpha(tokens.semantic.success, 0.12), color: INK },
          standardWarning: { backgroundColor: alpha(tokens.semantic.warning, 0.14), color: INK },
          standardError: { backgroundColor: alpha(tokens.semantic.error, 0.12), color: INK },
        },
      },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiDivider: { styleOverrides: { root: { borderColor: BORDER } } },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 6, '&:hover': { backgroundColor: alpha(PRIMARY, 0.08) } } },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 10, backgroundImage: SURFACE_GRADIENT } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: INK, color: '#ffffff', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 },
          arrow: { color: INK },
        },
      },
    },
  });
};

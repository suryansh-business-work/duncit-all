import { createTheme, alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
// Side-effect import registers DataGrid types on Theme.components so the
// `MuiDataGrid` override below type-checks.
import type {} from '@mui/x-data-grid/themeAugmentation';
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
    // Tighter corners across the app — user feedback was to dial radius
    // down. Cards/buttons/cells now feel closer to a flat-table look.
    shape: { borderRadius: 4 },
    typography: {
      fontFamily:
        '"Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
          // Flat surface with a thin border — no drop shadow in either mode.
          // Dark mode keeps a faint gradient for surface lift but the heavy
          // glow is gone per design feedback.
          root: {
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            backgroundColor: SURFACE,
            backgroundImage: isDark ? SURFACE_GRADIENT : 'none',
            boxShadow: 'none',
            transition: 'border-color 180ms ease',
            '&:hover': {
              borderColor: isDark ? alpha(PRIMARY, 0.32) : alpha(PRIMARY, 0.45),
            },
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
        styleOverrides: {
          root: {
            borderRadius: 4,
            '&:hover': { backgroundColor: alpha(PRIMARY, 0.08) },
            // Active item already wears `primary.main` as its background +
            // white text. Hover over it must NOT change either, otherwise
            // the contrast collapses (white text on light hover wash). Lock
            // it so the active state stays legible.
            '&.Mui-selected': {
              backgroundColor: PRIMARY,
              color: '#ffffff',
              '&:hover': { backgroundColor: PRIMARY_HOVER, color: '#ffffff' },
              '& .MuiListItemIcon-root': { color: 'inherit' },
            },
          },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 10, backgroundImage: SURFACE_GRADIENT } } },
      MuiTooltip: {
        styleOverrides: {
          // Dark mode bug fix: when both the tooltip bg and the page bg were
          // INK (#111…), tooltips disappeared. Always use a contrasting
          // surface — light tooltip in dark mode, dark tooltip in light.
          tooltip: {
            backgroundColor: isDark ? '#ffffff' : INK,
            color: isDark ? INK : '#ffffff',
            border: isDark ? `1px solid ${BORDER}` : 'none',
            borderRadius: 4,
            fontSize: '0.75rem',
            fontWeight: 600,
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
          },
          arrow: { color: isDark ? '#ffffff' : INK },
        },
      },
      // DataGrid: cleaner light-mode look — white surface, thin border per
      // cell, no zebra striping, hover gets a faint primary wash.
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            backgroundColor: SURFACE,
            '--DataGrid-rowBorderColor': BORDER,
          },
          columnHeaders: {
            backgroundColor: isDark ? alpha(INK, 0.04) : tokens.surface.soft,
            borderBottom: `1px solid ${BORDER}`,
          },
          cell: { borderBottom: `1px solid ${BORDER}` },
        },
      },
    },
  });
};

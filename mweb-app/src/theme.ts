import { createTheme, alpha } from '@mui/material/styles';

// Design-system tokens — keep colors and shape decisions here so every
// component picks them up via MUI styled().
export const tokens = {
  brand: {
    50: '#fff1f1',
    100: '#ffe1e1',
    200: '#ffc7c7',
    300: '#ff9e9e',
    400: '#ff7575',
    500: '#ff5757',
    600: '#f03e3e',
    700: '#d92d2d',
    800: '#b42323',
    900: '#8f1d1d',
  },
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

const PRIMARY = tokens.brand[500];
const PRIMARY_HOVER = tokens.brand[600];
const PRIMARY_ACTIVE = tokens.brand[700];
const INK = tokens.neutral[900];
const MUTED = tokens.neutral[500];
const BORDER = tokens.surface.border;
const BG = tokens.surface.bg;
const SURFACE = tokens.surface.paper;

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: tokens.brand[300],
      main: PRIMARY,
      dark: PRIMARY_ACTIVE,
      contrastText: '#ffffff',
    },
    secondary: { main: tokens.semantic.secondary, contrastText: '#ffffff' },
    success: { main: tokens.semantic.success },
    warning: { main: tokens.semantic.warning },
    error: { main: tokens.semantic.error },
    info: { main: tokens.semantic.info },
    background: { default: BG, paper: SURFACE },
    text: { primary: INK, secondary: MUTED },
    divider: BORDER,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          position: 'relative',
          overflowX: 'hidden',
          width: '100%',
        },
        '#root': { width: '100%', minHeight: '100dvh' },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': {
          background: alpha(INK, 0.18),
          borderRadius: 8,
        },
        '*::-webkit-scrollbar-thumb:hover': { background: alpha(INK, 0.28) },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'default' },
      styleOverrides: {
        root: {
          backgroundColor: SURFACE,
          color: INK,
          borderBottom: `1px solid ${BORDER}`,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        rounded: { borderRadius: 12 },
        outlined: { borderColor: BORDER },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          backgroundColor: SURFACE,
          boxShadow: `0 1px 2px ${alpha(INK, 0.04)}, 0 8px 24px -16px ${alpha(INK, 0.18)}`,
          transition: 'transform 180ms ease, box-shadow 180ms ease',
          '&:hover': {
            boxShadow: `0 2px 4px ${alpha(INK, 0.06)}, 0 16px 32px -16px ${alpha(INK, 0.25)}`,
          },
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: { focusHighlight: { borderRadius: 12 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          paddingBlock: 9,
          fontWeight: 600,
        },
        sizeLarge: { paddingInline: 24, paddingBlock: 12, fontSize: '1rem' },
        sizeSmall: { paddingInline: 14, paddingBlock: 6 },
        containedPrimary: {
          backgroundColor: PRIMARY,
          color: '#ffffff',
          '&:hover': { backgroundColor: PRIMARY_HOVER },
          '&:active': { backgroundColor: PRIMARY_ACTIVE },
        },
        outlinedPrimary: {
          borderColor: PRIMARY,
          color: PRIMARY,
          '&:hover': {
            borderColor: PRIMARY_HOVER,
            backgroundColor: alpha(PRIMARY, 0.06),
          },
        },
        textPrimary: {
          color: PRIMARY,
          '&:hover': { backgroundColor: alpha(PRIMARY, 0.06) },
        },
        outlined: {
          borderColor: BORDER,
          color: INK,
          '&:hover': { borderColor: alpha(INK, 0.4), backgroundColor: alpha(INK, 0.03) },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-focusVisible': { outline: `2px solid ${alpha(PRIMARY, 0.4)}` },
        },
      },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          height: 32,
          paddingInline: 6,
          fontSize: '0.8125rem',
        },
        outlined: { borderColor: BORDER, backgroundColor: SURFACE },
        filledPrimary: { backgroundColor: PRIMARY, color: '#ffffff' },
        filledSecondary: { backgroundColor: tokens.semantic.secondary, color: '#ffffff' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: SURFACE,
          '& fieldset': { borderColor: BORDER },
          '&:hover fieldset': { borderColor: alpha(INK, 0.3) },
          '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
        standardInfo: { backgroundColor: alpha(tokens.semantic.info, 0.1), color: INK },
        standardSuccess: { backgroundColor: alpha(tokens.semantic.success, 0.12), color: INK },
        standardWarning: { backgroundColor: alpha(tokens.semantic.warning, 0.14), color: INK },
        standardError: { backgroundColor: alpha(tokens.semantic.error, 0.12), color: INK },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: BORDER } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: 14,
          border: `1px solid ${BORDER}`,
          color: INK,
          '&.Mui-selected': {
            backgroundColor: PRIMARY,
            color: '#ffffff',
            '&:hover': { backgroundColor: PRIMARY_HOVER },
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { borderTop: `1px solid ${BORDER}`, backgroundColor: SURFACE },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: MUTED,
          '&.Mui-selected': { color: PRIMARY },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: INK,
          borderRadius: 8,
          fontSize: '0.75rem',
          paddingInline: 8,
          paddingBlock: 6,
        },
      },
    },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          boxShadow: `0 8px 32px -12px ${alpha(INK, 0.18)}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, minHeight: 44 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: PRIMARY, height: 3, borderRadius: 3 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, height: 6, backgroundColor: alpha(PRIMARY, 0.12) },
        bar: { backgroundColor: PRIMARY },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#fff',
            '& + .MuiSwitch-track': { backgroundColor: PRIMARY, opacity: 1 },
          },
        },
      },
    },
  },
});

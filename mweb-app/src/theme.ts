import { createTheme, alpha } from '@mui/material/styles';

// Moonit-inspired modern, soft, rounded design language.
// All visual decisions live here so every page picks them up via MUI styled().
const INK = '#0f172a'; // dark navy ink, used for primary CTAs and headings
const PRIMARY = '#0f172a';
const ACCENT = '#3b82f6';
const SECONDARY = '#9333ea';
const BG = '#f5f6fa';
const SURFACE = '#ffffff';
const BORDER = '#e6e8ef';
const MUTED = '#64748b';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: PRIMARY, contrastText: '#ffffff' },
    secondary: { main: SECONDARY, contrastText: '#ffffff' },
    info: { main: ACCENT },
    background: { default: BG, paper: SURFACE },
    text: { primary: INK, secondary: MUTED },
    divider: BORDER,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    body1: { fontSize: '0.95rem' },
    body2: { fontSize: '0.875rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BG,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
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
        rounded: { borderRadius: 18 },
        outlined: { borderColor: BORDER },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 20,
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
      styleOverrides: {
        focusHighlight: { borderRadius: 20 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          paddingBlock: 9,
          fontWeight: 600,
        },
        sizeLarge: { paddingInline: 24, paddingBlock: 12, fontSize: '1rem' },
        sizeSmall: { paddingInline: 14, paddingBlock: 6 },
        containedPrimary: {
          backgroundColor: INK,
          color: '#ffffff',
          '&:hover': { backgroundColor: '#1e293b' },
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
        root: { borderRadius: 12 },
      },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          height: 30,
          paddingInline: 4,
        },
        outlined: { borderColor: BORDER, backgroundColor: SURFACE },
        filledPrimary: { backgroundColor: INK, color: '#ffffff' },
        filledSecondary: { backgroundColor: SECONDARY, color: '#ffffff' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: SURFACE,
          '& fieldset': { borderColor: BORDER },
          '&:hover fieldset': { borderColor: alpha(INK, 0.3) },
          '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1.5 },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14 },
        standardInfo: {
          backgroundColor: alpha(ACCENT, 0.08),
          color: INK,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: BORDER } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: 14,
          border: `1px solid ${BORDER}`,
          color: INK,
          '&.Mui-selected': {
            backgroundColor: INK,
            color: '#ffffff',
            '&:hover': { backgroundColor: '#1e293b' },
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          borderTop: `1px solid ${BORDER}`,
          backgroundColor: SURFACE,
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
    MuiSnackbarContent: {
      styleOverrides: {
        root: { borderRadius: 14 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 22 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: `0 8px 32px -12px ${alpha(INK, 0.18)}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
        },
      },
    },
  },
});

import { createTheme, type Theme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export const buildTheme = (mode: PaletteMode): Theme =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#2563eb' },
            secondary: { main: '#9333ea' },
            background: { default: '#f6f7fb', paper: '#ffffff' },
            divider: 'rgba(15, 23, 42, 0.08)',
          }
        : {
            primary: { main: '#60a5fa' },
            secondary: { main: '#f472b6' },
            background: { default: '#0b1220', paper: '#111a2e' },
            divider: 'rgba(255, 255, 255, 0.08)',
          }),
    },
    shape: { borderRadius: 8 },
    spacing: 6, // tighter (default is 8) — denser, more compact UI
    typography: {
      fontFamily:
        '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 13.5,
      h4: { fontWeight: 700, fontSize: '1.5rem' },
      h5: { fontWeight: 600, fontSize: '1.2rem' },
      h6: { fontWeight: 600, fontSize: '1rem' },
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8125rem' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, [tabindex="0"]:focus-visible':
            {
              outline: '2px solid currentColor',
              outlineOffset: 2,
              borderRadius: 4,
            },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }),
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: { minHeight: 52, '@media (min-width:600px)': { minHeight: 56 } },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundImage: 'none',
            borderRight: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
          }),
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 14, '&:last-child': { paddingBottom: 14 } } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true, size: 'small' },
        styleOverrides: { root: { borderRadius: 6, paddingInline: 12 } },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiTable: { defaultProps: { size: 'small' } },
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: { root: { borderRadius: 6 } },
      },
      MuiIconButton: { defaultProps: { size: 'small' } },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 6, paddingTop: 4, paddingBottom: 4 } },
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 10 } } },
    },
  });

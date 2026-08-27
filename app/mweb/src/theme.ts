import { createTheme, alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { brand, neutral, semantic, light, dark, radii } from '@duncit/auth-tokens';
import { withPress } from '@duncit/buttons';

// Design-system tokens now come from the shared @duncit/auth-tokens package so
// the mobile app (NativeWind) and mWeb (MUI) draw from one source. Re-exported
// here under the same shape used across the app — no visual change.
export const tokens = { brand, neutral, semantic };

// The single source of white used across contrastText/chip/button colours below
// — `light.surface` is `@duncit/auth-tokens`' canonical white, so this stays in
// lock-step with the token package instead of a repeated hex literal.
const WHITE = light.surface;

// mWeb's own corner-radius scale, layered on top of the shared `radii` bucket
// tokens: values that already exist upstream (surface/tooltip/pill/hairline)
// are re-read from `radii` so they can't drift; `dialog`/`input` are
// mWeb-specific steps the shared scale doesn't cover (rounded-design policy,
// 2026-08-04).
export const RADIUS = {
  surface: radii.lg, // 16 — Paper/Card/Accordion
  dialog: 20,
  input: 12, // OutlinedInput/Alert/ToggleButton/Menu/ListItemButton
  tooltip: radii.md, // 10
  pill: radii.pill, // 999 — Button/IconButton/Chip/LinearProgress
  hairline: radii.sm, // 8 — scrollbar thumb + focus ring
} as const;
const SCROLLBAR_SIZE = 8;

export const buildTheme = (mode: PaletteMode = 'light') => {
  const isDark = mode === 'dark';
  const m = isDark ? dark : light;
  const INK = m.ink;
  const MUTED = m.muted;
  const BORDER = m.border;
  const BG = m.bg;
  const SURFACE = m.surface;
  const PRIMARY = m.primary;
  const PRIMARY_HOVER = m.primaryHover;
  const PRIMARY_ACTIVE = m.primaryActive;
  const APP_BG = isDark
    ? 'radial-gradient(circle at 8% 0%, rgba(255,79,115,0.20), transparent 34%), radial-gradient(circle at 90% 16%, rgba(139,92,246,0.18), transparent 32%), linear-gradient(180deg, #100d18 0%, #08070b 100%)'
    : `radial-gradient(circle at 8% 0%, rgba(255,79,115,0.15), transparent 34%), radial-gradient(circle at 90% 16%, rgba(139,92,246,0.10), transparent 32%), linear-gradient(180deg, #fff5f7 0%, ${WHITE} 62%)`;
  const SURFACE_GRADIENT = isDark
    ? `linear-gradient(180deg, ${alpha(WHITE, 0.05)} 0%, ${alpha(PRIMARY, 0.06)} 100%)`
    : `linear-gradient(180deg, ${WHITE} 0%, ${alpha(PRIMARY, 0.035)} 100%)`;
  return createTheme({
  palette: {
    mode,
    primary: {
      light: tokens.brand[300],
      main: PRIMARY,
      dark: PRIMARY_ACTIVE,
      contrastText: WHITE,
    },
    secondary: { main: tokens.semantic.secondary, contrastText: WHITE },
    success: { main: tokens.semantic.success },
    warning: { main: tokens.semantic.warning },
    error: { main: tokens.semantic.error },
    info: { main: tokens.semantic.info },
    background: { default: BG, paper: SURFACE },
    text: { primary: INK, secondary: MUTED },
    divider: BORDER,
  },
  shape: { borderRadius: RADIUS.surface },
  typography: {
    fontFamily:
      '"Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // Quicksand ships 300–700 — anything heavier renders as ugly synthesized
    // faux-bold, so 700 is the ceiling and body text stays regular.
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
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
  // Every pressable answers to the shared press system — the one place that
  // says what "being touched right now" looks like, and the same numbers the
  // native app reads through @duncit/buttons-native (rule 27).
  components: withPress(
    {
      MuiCssBaseline: {
        styleOverrides: {
          html: { width: '100%', overflowX: 'hidden' },
          body: {
            '--duncit-app-bg': APP_BG,
            backgroundColor: BG,
            backgroundImage: 'var(--duncit-app-bg)',
            backgroundAttachment: 'fixed',
            backgroundSize: '180% 180%',
            animation: 'duncit-bg-drift 36s ease-in-out infinite alternate',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            position: 'relative',
            overflowX: 'hidden',
            width: '100%',
          },
          '#root': { width: '100%', minHeight: '100dvh' },
          '@keyframes duncit-bg-drift': {
            '0%': { backgroundPosition: '0% 0%' },
            '50%': { backgroundPosition: '65% 18%' },
            '100%': { backgroundPosition: '100% 0%' },
          },
          '@keyframes duncit-soft-enter': {
            '0%': { opacity: 0.72 },
            '100%': { opacity: 1 },
          },
          '.MuiPaper-root, .MuiButtonBase-root, .MuiChip-root': {
            transitionDuration: '180ms',
            transitionTimingFunction: 'ease',
          },
          '*::-webkit-scrollbar': { width: SCROLLBAR_SIZE, height: SCROLLBAR_SIZE },
          '*::-webkit-scrollbar-thumb': {
            background: alpha(INK, 0.18),
            borderRadius: RADIUS.hairline,
          },
          '*::-webkit-scrollbar-thumb:hover': { background: alpha(INK, 0.28) },
          // Accessibility: visible focus ring for keyboard users.
          'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, [tabindex="0"]:focus-visible':
            {
              outline: `2px solid ${PRIMARY}`,
              outlineOffset: 2,
              borderRadius: RADIUS.hairline,
            },
          // Touch target minimum (WCAG 2.5.5 / iOS HIG).
          '@media (pointer: coarse)': {
            'button, a[role="button"], [role="button"]': {
              minHeight: 44,
            },
          },
        },
      },
      MuiButtonBase: {
        defaultProps: { disableTouchRipple: false },
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
          rounded: { borderRadius: RADIUS.surface },
          outlined: { borderColor: BORDER },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.surface,
            border: `1px solid ${BORDER}`,
            backgroundColor: SURFACE,
            backgroundImage: SURFACE_GRADIENT,
            boxShadow: `0 14px 34px -22px ${alpha(INK, isDark ? 0.72 : 0.28)}`,
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            '&:hover': {
              boxShadow: `0 18px 42px -24px ${alpha(PRIMARY, 0.34)}`,
            },
          },
        },
      },
      MuiCardActionArea: {
        styleOverrides: { focusHighlight: { borderRadius: RADIUS.surface } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        // Was containedPrimary / outlinedPrimary / textPrimary — MUI 9 dropped
        // those class slots, so the same rules match on props instead.
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              backgroundColor: PRIMARY,
              color: WHITE,
              '&:hover': { backgroundColor: PRIMARY_HOVER },
              '&:active': { backgroundColor: PRIMARY_ACTIVE },
            },
          },
          {
            props: { variant: 'outlined', color: 'primary' },
            style: {
              borderColor: PRIMARY,
              color: PRIMARY,
              '&:hover': { borderColor: PRIMARY_HOVER, backgroundColor: alpha(PRIMARY, 0.06) },
            },
          },
          {
            props: { variant: 'text', color: 'primary' },
            style: {
              color: PRIMARY,
              '&:hover': { backgroundColor: alpha(PRIMARY, 0.06) },
            },
          },
        ],
        styleOverrides: {
          root: {
            borderRadius: RADIUS.pill,
            paddingInline: 18,
            paddingBlock: 9,
            fontWeight: 600,
            lineHeight: 1.1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            '& .MuiButton-startIcon, & .MuiButton-endIcon': {
              flexShrink: 0,
            },
          },
          sizeLarge: { paddingInline: 20, paddingBlock: 11, fontSize: '0.92rem' },
          sizeSmall: { paddingInline: 12, paddingBlock: 6, fontSize: '0.78rem' },
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
            borderRadius: RADIUS.pill,
            '&.Mui-focusVisible': { outline: `2px solid ${alpha(PRIMARY, 0.4)}` },
          },
        },
      },
      MuiChip: {
        defaultProps: { size: 'small' },
        variants: [
          { props: { variant: 'filled', color: 'primary' }, style: { backgroundColor: PRIMARY, color: WHITE } },
          {
            props: { variant: 'filled', color: 'secondary' },
            style: { backgroundColor: tokens.semantic.secondary, color: WHITE },
          },
        ],
        styleOverrides: {
          root: {
            borderRadius: RADIUS.pill,
            fontWeight: 600,
            height: 32,
            paddingInline: 6,
            fontSize: '0.8125rem',
          },
          outlined: { borderColor: BORDER, backgroundColor: SURFACE },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiInputBase: {
        styleOverrides: {
          /**
           * MUI's default placeholder is `currentColor` at `opacity: .42` — on
           * our ink that lands around 3:1 against the field, under the 4.5:1
           * WCAG floor, and on a filled grey field it reads as a disabled
           * control rather than a hint. The muted ink at full opacity is the
           * same colour every helper line uses, so a hint now looks like a hint.
           * `input` covers `<textarea>` too — both carry `.MuiInputBase-input`.
           */
          input: {
            '&::placeholder': { color: MUTED, opacity: 1 },
          },
        },
      },
      MuiFormControl: {
        styleOverrides: { root: { minWidth: 0 } },
      },
      MuiFormLabel: {
        // The `required` asterisk is rendered red so every required field carries a
        // clear `Label *` marker on the label (matches the mobile app's red `*`).
        styleOverrides: { asterisk: { color: tokens.semantic.error } },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginTop: 5,
            marginBottom: 6,
            lineHeight: 1.35,
            minHeight: '1.35em',
            overflowWrap: 'anywhere',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.input,
            backgroundColor: SURFACE,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: alpha(INK, 0.3) },
            '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
          },
        },
      },
      MuiAlert: {
        variants: [
          {
            props: { variant: 'standard', severity: 'info' },
            style: { backgroundColor: alpha(tokens.semantic.info, 0.1), color: INK },
          },
          {
            props: { variant: 'standard', severity: 'success' },
            style: { backgroundColor: alpha(tokens.semantic.success, 0.12), color: INK },
          },
          {
            props: { variant: 'standard', severity: 'warning' },
            style: { backgroundColor: alpha(tokens.semantic.warning, 0.14), color: INK },
          },
          {
            props: { variant: 'standard', severity: 'error' },
            style: { backgroundColor: alpha(tokens.semantic.error, 0.12), color: INK },
          },
        ],
        styleOverrides: {
          root: { borderRadius: RADIUS.input, border: `1px solid ${BORDER}` },
        },
      },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiDivider: { styleOverrides: { root: { borderColor: BORDER } } },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.surface,
            border: `1px solid ${BORDER}`,
            backgroundColor: SURFACE,
            backgroundImage: SURFACE_GRADIENT,
            boxShadow: 'none',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: 0 },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.input,
            '&:hover': { backgroundColor: alpha(PRIMARY, 0.08) },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.input,
            textTransform: 'none',
            fontWeight: 600,
            paddingInline: 14,
            border: `1px solid ${BORDER}`,
            color: INK,
            '&.Mui-selected': {
              backgroundColor: PRIMARY,
              color: WHITE,
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
          // Always a near-black surface regardless of mode — a tooltip needs to
          // read the same in both, and neutral[900] contrasts with white text
          // either way (dark mode adds a hairline border since its page bg is
          // close in tone to this fill).
          tooltip: {
            backgroundColor: tokens.neutral[900],
            color: WHITE,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'transparent'}`,
            borderRadius: RADIUS.tooltip,
            fontSize: '0.75rem',
            fontWeight: 600,
            paddingInline: 8,
            paddingBlock: 6,
          },
          arrow: {
            color: tokens.neutral[900],
          },
        },
      },
      MuiSnackbarContent: { styleOverrides: { root: { borderRadius: RADIUS.input } } },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: RADIUS.dialog, backgroundImage: SURFACE_GRADIENT },
          // `paper` is composed AFTER MUI's own `paperFullScreen`, so without this
          // every fullScreen dialog keeps 20px corners against the backdrop — and
          // since the paper also carries `overflowY: auto`, content is clipped at
          // those corners.
          paperFullScreen: { borderRadius: 0 },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS.input,
            border: `1px solid ${BORDER}`,
            boxShadow: `0 8px 32px -12px ${alpha(INK, 0.18)}`,
      /**
       * Every dropdown in the app, capped.
       *
       * MUI's own cap is `calc(100% - 96px)` where 100% is the LARGE viewport (the
       * Menu is a portalled Popover on document.body, so it can never be clipped by
       * the dialog it was opened from). Below the `sm` breakpoint MenuItem also has
       * a hard `minHeight: 48` — and mWeb is entirely below `sm`. So a 15-option
       * select is 15x48+16 = 736px against a 748px cap on a 390x844 phone: the cap
       * never engages, and the list runs under the browser toolbar and straight
       * across whatever dialog opened it. `dvh` tracks the collapsible toolbar;
       * 336px is 7 rows, which reads as a list rather than a takeover.
       */
            maxHeight: 'min(calc(100% - 96px), 45dvh, 336px)',
          },
        },
      },
      // The Autocomplete popup is a Popper, not a Menu, so the cap above misses
      // it. MUI's default is `40vh` — the LARGE viewport, which also does not
      // shrink when the keyboard opens, and an Autocomplete always has focus.
      MuiAutocomplete: {
        styleOverrides: { listbox: { maxHeight: 'min(40dvh, 320px)' } },
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
          root: { borderRadius: RADIUS.pill, height: 6, backgroundColor: alpha(PRIMARY, 0.12) },
          bar: { backgroundColor: PRIMARY },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: WHITE,
              '& + .MuiSwitch-track': { backgroundColor: PRIMARY, opacity: 1 },
            },
          },
        },
      },
    },
    { ink: INK, accent: PRIMARY }
  ),
  });
};

export const theme = buildTheme('light');

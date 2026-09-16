import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';

/**
 * Everything that floats — dialogs, drawers, menus, popovers, the autocomplete
 * list — and the scrim behind them. One raised surface, one hairline edge and
 * the system's overlay shadow, so a menu and a dialog read as the same layer.
 * Spacing comes from the theme's 8px scale, never a literal.
 */
const floating = (c: ThemeCtx, shadow: string) => ({
  backgroundColor: c.raised,
  backgroundImage: 'none',
  border: `1px solid ${c.border}`,
  boxShadow: shadow,
});

export const dialog = (c: ThemeCtx): Components<Theme>['MuiDialog'] => ({
  styleOverrides: {
    paper: ({ theme }) => ({
      ...floating(c, c.shadow.dialog),
      borderRadius: c.t.radius.lg,
      // A phone keeps a sliver of the page visible around the sheet.
      [theme.breakpoints.down('sm')]: {
        margin: theme.spacing(1.5),
        width: `calc(100% - ${theme.spacing(3)})`,
        maxHeight: `calc(100% - ${theme.spacing(3)})`,
      },
    }),
    // `paper` is composed AFTER MUI's own `paperFullScreen`, so without this a
    // fullScreen dialog keeps rounded corners against the backdrop — and since
    // the paper also carries `overflowY: auto`, its content is clipped at them.
    paperFullScreen: ({ theme }) => ({
      borderRadius: 0,
      border: 0,
      [theme.breakpoints.down('sm')]: { margin: 0, width: '100%', maxHeight: '100%' },
    }),
  },
});

export const dialogTitle = (c: ThemeCtx): Components<Theme>['MuiDialogTitle'] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      fontSize: c.t.font.size.h6,
      fontWeight: c.t.font.weight.semibold,
      letterSpacing: '-0.01em',
      padding: theme.spacing(2, 2.5, 1),
    }),
  },
});

export const dialogContent = (c: ThemeCtx): Components<Theme>['MuiDialogContent'] => ({
  styleOverrides: {
    root: ({ theme }) => ({ padding: theme.spacing(1, 2.5, 2) }),
    dividers: ({ theme }) => ({ padding: theme.spacing(2, 2.5), borderColor: c.border }),
  },
});

/** The footer sits on a hairline, as its own band. */
export const dialogActions = (c: ThemeCtx): Components<Theme>['MuiDialogActions'] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1.5, 2.5),
      gap: theme.spacing(1),
      flexWrap: 'wrap',
      borderTop: `1px solid ${c.border}`,
      // Content with dividers already drew this line.
      '.MuiDialogContent-dividers + &': { borderTop: 0 },
      // `gap` spaces the buttons, so they also wrap cleanly on a phone.
      '& > :not(style) ~ :not(style)': { marginLeft: 0 },
    }),
  },
});

/** The scrim. Invisible backdrops (menus, popovers) are left alone. */
export const backdrop = (c: ThemeCtx): Components<Theme>['MuiBackdrop'] => ({
  styleOverrides: {
    root: {
      '&:not(.MuiBackdrop-invisible)': {
        backgroundColor: alpha(c.t.common.black, c.isDark ? c.t.shadow.scrim.dark : c.t.shadow.scrim.light),
      },
    },
  },
});

export const drawer = (c: ThemeCtx): Components<Theme>['MuiDrawer'] => ({
  styleOverrides: {
    paper: { backgroundImage: 'none', borderColor: c.border },
    modal: { '& .MuiDrawer-paper': { backgroundColor: c.raised, boxShadow: c.shadow.dialog } },
  },
});

export const popover = (c: ThemeCtx): Components<Theme>['MuiPopover'] => ({
  styleOverrides: {
    paper: { ...floating(c, c.shadow.overlay), borderRadius: c.t.radius.md },
  },
});

/**
 * Every dropdown, capped.
 *
 * MUI caps a Menu at `calc(100% - 96px)` where 100% is the LARGE viewport — a
 * Menu is a portalled Popover on document.body, so it can never be clipped by
 * the dialog that opened it, and on a narrow window a long option list runs
 * across the whole screen. Below the `sm` breakpoint MenuItem also has a hard
 * `minHeight: 48`, so the cap engages even later there. `dvh` tracks a mobile
 * browser's collapsible toolbar; 336px is ~7 rows, which reads as a list rather
 * than a takeover.
 *
 * Kept word-for-word in sync with app/mweb/src/theme.ts — mWeb does not consume
 * this package (it has its own theme), so the two carry the same rule twice.
 */
export const menu = (): Components<Theme>['MuiMenu'] => ({
  styleOverrides: {
    paper: ({ theme }) => ({ maxHeight: 'min(calc(100% - 96px), 45dvh, 336px)', minWidth: theme.spacing(22) }),
    list: ({ theme }) => ({ padding: theme.spacing(0.5) }),
  },
});

export const menuItem = (c: ThemeCtx): Components<Theme>['MuiMenuItem'] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: c.t.radius.xs,
      fontSize: c.t.font.size.body2,
      gap: theme.spacing(1),
      [theme.breakpoints.up('sm')]: { minHeight: c.t.size.controlMd },
      '&:hover': { backgroundColor: c.hover },
      '&.Mui-selected': { backgroundColor: alpha(c.primary, c.t.state.selected + c.t.state.hover) },
      '& .MuiListItemIcon-root': { minWidth: 0, color: c.muted },
      '& .MuiSvgIcon-root': { fontSize: c.t.size.icon.md },
    }),
  },
});

/** The Autocomplete popup is a Popper, so the Menu cap above misses it. MUI's
 * own `40vh` is the large viewport and does not shrink for the keyboard — and
 * an Autocomplete always has focus. */
export const autocomplete = (c: ThemeCtx): Components<Theme>['MuiAutocomplete'] => ({
  styleOverrides: {
    paper: ({ theme }) => ({
      ...floating(c, c.shadow.overlay),
      borderRadius: c.t.radius.md,
      marginTop: theme.spacing(0.5),
    }),
    listbox: ({ theme }) => ({
      maxHeight: 'min(40dvh, 320px)',
      padding: theme.spacing(0.5),
      '& .MuiAutocomplete-option': { borderRadius: c.t.radius.xs, fontSize: c.t.font.size.body2 },
    }),
    noOptions: { fontSize: c.t.font.size.body2, color: c.muted },
    loading: { fontSize: c.t.font.size.body2, color: c.muted },
  },
});

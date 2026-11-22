import type { CSSObject, Theme } from '@mui/material/styles';
import { tokens } from '@duncit/theme';
import { ABOVE_TASKBAR_HEIGHT } from './Taskbar';

/**
 * Where a Drawer's paper may reach, per anchor: never under the taskbar.
 *
 * A side sheet ends where the bar starts, a bottom sheet sits on top of it, and
 * a top sheet is capped at the same line. Matched on the paper's `anchor`,
 * which MUI resolves for RTL before styling, so a `left` drawer in an RTL
 * locale is still the one that gets the side rule.
 */
const PAPER_CLEARANCE: CSSObject = {
  variants: [
    { props: { anchor: 'left' }, style: { height: ABOVE_TASKBAR_HEIGHT } },
    { props: { anchor: 'right' }, style: { height: ABOVE_TASKBAR_HEIGHT } },
    { props: { anchor: 'top' }, style: { maxHeight: ABOVE_TASKBAR_HEIGHT } },
    {
      props: { anchor: 'bottom' },
      style: { bottom: `${tokens.size.taskbarHeight}px`, maxHeight: ABOVE_TASKBAR_HEIGHT },
    },
  ],
};

/**
 * The console's theme, with every Drawer stopping at the taskbar.
 *
 * A Drawer's paper is `position: fixed`, so it measures the VIEWPORT, and it
 * stacks at `zIndex.drawer` — temporary drawers included, because MUI gives
 * their Modal the drawer layer rather than the modal one. The taskbar sits a
 * few steps above that layer, so every drawer a page opened ran underneath the
 * bar and lost its last 40px: the final detail row, the save button, the
 * composer. The shell's own drawers used to patch their papers one by one;
 * layering it onto the theme here does it once for every drawer every console
 * renders, page or package, without any of them knowing the bar exists.
 *
 * It is applied by AppShell only — the one place a taskbar is drawn — so a
 * login screen, or mWeb sharing the same theme package, keeps full-height
 * sheets. A height a drawer sets on its own paper `sx` still wins, for the one
 * that measures itself against something else as well (CRM's Ask AI).
 *
 * Module-level, not an inline arrow: ThemeProvider memoises on the function's
 * identity, so this re-runs only when the outer theme does (a mode toggle).
 */
export function withTaskbarClearance(outer: Theme): Theme {
  const drawer = outer.components?.MuiDrawer;
  return {
    ...outer,
    components: {
      ...outer.components,
      MuiDrawer: {
        ...drawer,
        styleOverrides: {
          ...drawer?.styleOverrides,
          // Layered after the theme's own paper look, not instead of it.
          paper: [drawer?.styleOverrides?.paper, PAPER_CLEARANCE],
        },
      },
    },
  };
}

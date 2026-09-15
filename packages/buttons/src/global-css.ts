import type { CSSObject } from '@mui/material/styles';

/**
 * Everything a keyboard can land on. Native elements match on `:focus-visible`;
 * every MUI `ButtonBase` (checkboxes, radios, switches, accordion summaries —
 * not only the buttons `withPress` lists) matches on the `Mui-focusVisible`
 * class MUI puts on it. `tabindex="-1"` is left out on purpose: it marks a
 * programmatic focus target (a dialog paper, `<main id="main-content">`) that a
 * keyboard never tabs to.
 */
const FOCUS_TARGETS = [
  'a',
  'button',
  'summary',
  'select',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:focus-visible`)
  .concat('.MuiButtonBase-root.Mui-focusVisible')
  .join(', ');

/**
 * The page-wide keyboard focus ring, for a theme's `MuiCssBaseline`.
 *
 * 2px solid with a 2px offset, so the ring sits on the page ground rather than
 * on a coloured fill — `color` must clear 3:1 against that ground (WCAG 1.4.11 /
 * 2.4.7), which the themes guarantee by passing their AA text accent. No
 * `border-radius` is set: an outline already follows the element's own corners,
 * and forcing one reshaped every pill button the moment it took focus.
 */
export function focusVisibleGlobalCss(color: string): CSSObject {
  return {
    [FOCUS_TARGETS]: { outline: `2px solid ${color}`, outlineOffset: 2 },
  };
}

/**
 * `prefers-reduced-motion: reduce`, honoured once for the whole page (WCAG
 * 2.3.3). Transitions and decorative animations collapse to an instant change.
 * Progress indicators keep spinning: a frozen spinner reads as a broken page,
 * and it is the one animation that carries information.
 */
export const reducedMotionGlobalCss: CSSObject = {
  '@media (prefers-reduced-motion: reduce)': {
    '*:not([role="progressbar"], [role="progressbar"] *), *::before, *::after': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    },
  },
};

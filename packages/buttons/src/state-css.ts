import type { CSSObject, Theme } from '@mui/material/styles';
import type { PressIntent } from '@duncit/buttons-native';
import { focusRingCss, pressCss, type PressColors, type PressCssOptions } from './press-css';

/** Read the two colours the state system needs out of whatever theme is mounted. */
export const pressColorsOf = (theme: Theme): PressColors => ({
  ink: theme.palette.text.primary,
  accent: theme.palette.primary.main,
});

/**
 * The states a pressable has beyond being pressed.
 *
 * Two of them, and deliberately not a third:
 *
 * - **Focus** is a real gap. MUI's default focus ring is a faint shadow that
 *   disappears against a coloured fill, so a keyboard user tabbing a form could
 *   not see where they were. Every pressable in the system carries the same
 *   2px accent ring instead.
 * - **Loading** is a real gap in the opposite direction: MUI dims a loading
 *   button like a disabled one, and a form that greys out on submit looks like
 *   it rejected the submit. A loading button is still the thing you just
 *   pressed — it keeps its colour and only stops taking input.
 * - **Disabled is left to MUI on purpose.** Its treatment is proven and
 *   accessible, and every alternative here is worse: `opacity` on top of MUI's
 *   grey wash makes a contained button almost invisible, and forcing the
 *   button's own colour back needs a variant per palette colour — a visual
 *   change to all ~1,800 buttons in the product for a state that was never
 *   broken. The press system's contribution to `disabled` is that it does not
 *   fire (see `pressCss`). Native paints its own buttons, has no MUI default to
 *   compose with, and dims to `DISABLED_OPACITY` there.
 */
export function restStatesCss(theme: Theme): CSSObject {
  return {
    ...focusRingCss(pressColorsOf(theme)),
    '&.MuiButton-loading, &.MuiIconButton-loading': {
      opacity: 1,
      cursor: 'progress',
    },
  };
}

/** The press block for an intent, in whatever theme is mounted. */
export const pressFor = (
  theme: Theme,
  intent: PressIntent,
  options?: Readonly<PressCssOptions>
): CSSObject => pressCss(intent, pressColorsOf(theme), options);


import type { CSSObject, Theme } from '@mui/material/styles';
import {
  BUTTON_SIZES,
  DISABLED_OPACITY,
  type ButtonSize,
  type PressIntent,
} from '@duncit/buttons-native';
import { focusRingCss, pressCss, type PressColors, type PressCssOptions } from './press-css';

/** Read the two colours the state system needs out of whatever theme is mounted. */
export const pressColorsOf = (theme: Theme): PressColors => ({
  ink: theme.palette.text.primary,
  accent: theme.palette.primary.main,
});

/** MUI's size names, in Duncit's. Kept so a call site never has to translate. */
export const SIZE_BY_MUI: Readonly<Record<'small' | 'medium' | 'large', ButtonSize>> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

/**
 * The states a button has beyond being pressed.
 *
 * Disabled and loading are separated on purpose: a disabled button has nothing
 * to do and recedes, a loading button is still the thing you just pressed and
 * keeps its colour — it has simply stopped taking input. Collapsing them (which
 * is what `disabled={loading}` does, and what most of the call sites did) makes
 * a form look like it rejected the submit.
 */
export function restStatesCss(theme: Theme): CSSObject {
  return {
    ...focusRingCss(pressColorsOf(theme)),
    '&.Mui-disabled': {
      opacity: DISABLED_OPACITY,
      // The dim IS the disabled signal; MUI's grey wash on top of it reads as a
      // different colour rather than as the same button, switched off.
      color: 'inherit',
      borderColor: 'inherit',
      backgroundColor: 'inherit',
      boxShadow: 'none',
    },
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

/** Minimum height for a size, so no button lands under the touch target. */
export const minHeightFor = (size: ButtonSize): number => BUTTON_SIZES[size].height;

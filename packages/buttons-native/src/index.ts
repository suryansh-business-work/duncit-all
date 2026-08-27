/**
 * @duncit/buttons-native — what a pressed control looks like, as numbers.
 *
 * Every tappable thing in Duncit answers to the six intents in `PRESS`. This
 * half is framework-free so the native app can import it (a linked package is
 * compiled from its own source and resolves nothing from `packages/<name>/` in
 * CI, so it may not import `react` or `tamagui`); the Tamagui view that spends
 * these numbers lives in `app/mobile-app/src/components/DuncitButton/`, the
 * same split `@duncit/dialogs-native` and `@duncit/slots` use.
 *
 * Its MUI twin is `@duncit/buttons`, which layers mWeb and the portals onto
 * these exact values — that is what keeps rule 27 true for press feedback.
 */
export {
  PRESS,
  PRESS_INTENTS,
  PRESS_RELEASE_MS,
  DISABLED_OPACITY,
  TOUCH_TARGET,
  type PressIntent,
  type PressRecipe,
} from './intents';
export { PRESS_STYLE, pressStyle, type NativePressStyle } from './press';
export {
  buttonSpec,
  BUTTON_SIZES,
  type ButtonSize,
  type ButtonSizeSpec,
  type ButtonSpec,
  type ButtonSpecInput,
  type ButtonTone,
  type ButtonVariant,
} from './button';
export { withAlpha, hexToRgb, clampAlpha } from './color';
export { pressThemeKeys, SOFT_ALPHA, type BrandColorsInput, type PressThemeKeys } from './theme';

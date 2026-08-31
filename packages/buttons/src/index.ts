/**
 * @duncit/buttons — the MUI half of Duncit's press system.
 *
 * Two ways in, and both are needed:
 *
 * - `DuncitButton` / `DuncitIconButton` replace `@mui/material`'s `Button` and
 *   `IconButton` at every call site in mWeb and the 17 portals. They forward
 *   MUI's props unchanged and carry every state themselves, so they behave the
 *   same in a surface that has not wired the theme layer.
 * - `withPress` layers the same states onto the theme, which is the only way to
 *   reach the pressables no call site owns — the buttons inside MUI X pickers,
 *   the DataGrid and Autocomplete — plus menu items, list rows, tabs, chips,
 *   toggles and card action areas.
 *
 * The numbers behind both live in `@duncit/buttons-native`, which the mobile
 * app reads directly. One recipe, three surfaces.
 */
export { DuncitButton, type DuncitButtonProps } from './DuncitButton';
export { DuncitIconButton, type DuncitIconButtonProps } from './DuncitIconButton';
export {
  DuncitRoundButton,
  type DuncitRoundButtonProps,
  type RoundButtonTone,
} from './DuncitRoundButton';
export { withPress } from './components';
export {
  pressCss,
  focusRingCss,
  pressTransition,
  type PressColors,
  type PressCssOptions,
  type TintSource,
} from './press-css';
export { pressColorsOf, pressFor, restStatesCss } from './state-css';
export { mergeCss, mergeSlot, type SlotStyle } from './merge';
export {
  PRESS,
  PRESS_INTENTS,
  PRESS_RELEASE_MS,
  DISABLED_OPACITY,
  TOUCH_TARGET,
  BUTTON_SIZES,
  buttonSpec,
  withAlpha,
  type PressIntent,
  type PressRecipe,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from '@duncit/buttons-native';

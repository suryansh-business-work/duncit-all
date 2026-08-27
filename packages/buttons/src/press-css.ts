import type { CSSObject } from '@mui/material/styles';
import { PRESS, PRESS_RELEASE_MS, withAlpha, type PressIntent } from '@duncit/buttons-native';

export interface PressColors {
  /** The surface's text colour — what a neutral state layer is tinted with. */
  ink: string;
  /** The brand accent — what an accent-coloured control tints with instead. */
  accent: string;
}

/** Which colour a control's state layer is drawn in. */
export type TintSource = 'ink' | 'accent' | 'none';

export interface PressCssOptions {
  /**
   * Only a control that is transparent by default may take a state layer:
   * `background-color` replaces a fill, it does not layer over one, so tinting
   * a filled chip turns it translucent grey instead of pressing it.
   */
  tint?: TintSource;
}

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

/**
 * The transition every pressable carries at rest.
 *
 * Only the RELEASE is animated. Press-down is instant (`&:active` clears the
 * transition) because animating the press in is the one thing that makes a
 * touch UI feel broken — the finger is lifting before the control has finished
 * reacting.
 */
export const pressTransition = `transform ${PRESS_RELEASE_MS}ms ${EASE}, opacity ${PRESS_RELEASE_MS}ms ${EASE}, background-color ${PRESS_RELEASE_MS}ms ${EASE}, filter ${PRESS_RELEASE_MS}ms ${EASE}, box-shadow ${PRESS_RELEASE_MS}ms ${EASE}`;

function tintColor(tint: TintSource, colors: Readonly<PressColors>): string | undefined {
  if (tint === 'ink') {
    return colors.ink;
  }
  if (tint === 'accent') {
    return colors.accent;
  }
  return undefined;
}

/**
 * The `:active` block for one intent, ready to spread into any `styleOverrides`
 * slot or `sx`.
 *
 * The numbers come from `@duncit/buttons-native`, which is also what the app's
 * Tamagui components read — so a pressed button in mWeb and a pressed button in
 * the app compress and dim by the same amount (rule 27).
 */
export function pressCss(
  intent: PressIntent,
  colors: Readonly<PressColors>,
  options: Readonly<PressCssOptions> = {}
): CSSObject {
  const recipe = PRESS[intent];
  const layer = tintColor(options.tint ?? 'none', colors);
  const active: CSSObject = { transition: 'none' };

  if (recipe.scale !== 1) {
    active.transform = `scale(${recipe.scale})`;
  }
  if (recipe.opacity !== 1) {
    active.opacity = recipe.opacity;
  }
  if (recipe.brightness !== 1) {
    active.filter = `brightness(${recipe.brightness})`;
  }
  if (layer && recipe.tint > 0) {
    active.backgroundColor = withAlpha(layer, recipe.tint);
  }

  return {
    transition: pressTransition,
    '&:active': active,
    // A control with nothing to do must not react to being held. MUI already
    // sets pointer-events: none on a disabled button, so this is the belt to
    // that braces — a call site can re-enable pointer events for a tooltip.
    '&.Mui-disabled:active, &:disabled:active': { transform: 'none', filter: 'none' },
  };
}

/**
 * The keyboard's half of the same story.
 *
 * A pointer gets hover and press; a keyboard gets neither, and MUI's default
 * focus ring is a faint shadow that disappears against a coloured button. Every
 * pressable in the system carries the same ring so tabbing through a page is
 * legible on any surface.
 */
export function focusRingCss(colors: Readonly<PressColors>): CSSObject {
  return {
    '&.Mui-focusVisible, &:focus-visible': {
      outline: `2px solid ${colors.accent}`,
      outlineOffset: 2,
    },
  };
}

import { DISABLED_OPACITY, PRESS, type PressIntent } from './intents';

/**
 * A Tamagui/React Native style fragment. Deliberately structural — this
 * package cannot import `tamagui`, and the real `ViewStyle` still satisfies
 * this shape at the call site.
 */
export interface NativePressStyle {
  opacity?: number;
  scale?: number;
}

/**
 * The ready-made press styles, one per intent, frozen and shared.
 *
 * Exported as objects rather than a function because Tamagui re-reads
 * `pressStyle` on every render: a fresh object literal per render is a new
 * style to diff several hundred times over on a scrolling list, and the app
 * had one written by hand at 436 call sites.
 *
 * ```tsx
 * <XStack onPress={openPod} pressStyle={PRESS_STYLE.surface}>
 * ```
 */
export const PRESS_STYLE: Readonly<Record<PressIntent, Readonly<NativePressStyle>>> = Object.freeze(
  {
    solid: Object.freeze({ scale: PRESS.solid.scale }),
    control: Object.freeze({ opacity: PRESS.control.opacity, scale: PRESS.control.scale }),
    ghost: Object.freeze({ opacity: PRESS.ghost.opacity, scale: PRESS.ghost.scale }),
    surface: Object.freeze({ opacity: PRESS.surface.opacity, scale: PRESS.surface.scale }),
    row: Object.freeze({ opacity: PRESS.row.opacity }),
    inline: Object.freeze({ opacity: PRESS.inline.opacity }),
  }
);

/**
 * The press style for an intent, dropped entirely when the control is
 * disabled. A disabled control that still compresses under a finger claims it
 * did something.
 */
export function pressStyle(
  intent: PressIntent,
  disabled = false
): Readonly<NativePressStyle> | undefined {
  return disabled ? undefined : PRESS_STYLE[intent];
}

/** Opacity a control renders at, given its disabled state. */
export const restingOpacity = (disabled: boolean): number => (disabled ? DISABLED_OPACITY : 1);

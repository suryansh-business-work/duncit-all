import { Platform } from 'react-native';
import { Easing, ReduceMotion } from 'react-native-reanimated';

/**
 * Central motion language — every animation in the app reads its timing from
 * here so transitions feel consistent (premium 250–350ms range, one easing,
 * one spring). All Reanimated-driven motion respects the OS reduced-motion
 * setting via `ReduceMotion.System`.
 */
export const durations = {
  /** Micro interactions: presses, chevrons, badges. */
  fast: 180,
  /** Entry animations: sections, cards, list items. */
  base: 280,
  /** Screen-level transitions. */
  slow: 320,
} as const;

/** Decelerating ease-out — content settles instead of stopping abruptly. */
export const easeOut = Easing.out(Easing.cubic);

/** Spring for press feedback: snappy with a soft settle, no wobble. */
export const pressSpring = {
  damping: 18,
  stiffness: 260,
  mass: 0.7,
  reduceMotion: ReduceMotion.System,
} as const;

/** Gap between staggered siblings. */
export const STAGGER_MS = 60;

/** Stagger delays cap here so long lists never feel sluggish. */
export const MAX_STAGGER_STEPS = 8;

/** Delay for the `index`-th item of a staggered group (capped). */
export function staggerDelay(index: number): number {
  if (index <= 0) return 0;
  return Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
}

export { ReduceMotion };

/** RN's core Animated has no native driver on the web — fall back to JS there
 * (silences the "useNativeDriver is not supported" warning on native web). */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

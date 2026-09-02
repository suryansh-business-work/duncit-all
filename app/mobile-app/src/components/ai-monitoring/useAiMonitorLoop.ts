import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * One 0→1 value looping while `active`, stopped the moment it is not.
 *
 * Every AI Monitoring animation in the app runs on this: the chip's sheen, the
 * spark's twinkle, the badge's breath, the rings and the scan bar. It exists
 * as a hook rather than five `useEffect`s because of the `stop()` — an overlay
 * nobody is looking at, or a chip on an unmounted screen, must not keep a
 * driver ticking, and that is exactly the line each hand-rolled copy forgets.
 *
 * `delayMs` runs ONCE, before the loop, not before each iteration: it is there
 * to stagger two rings against each other, and a per-iteration delay would
 * leave the badge bare between flights instead.
 *
 * `useNativeDriver`: every consumer animates `transform` or `opacity` only, so
 * the loop runs off the JS thread and survives a busy render.
 */
export function useAiMonitorLoop(active: boolean, duration: number, delayMs = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    value.setValue(0);
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const animation = delayMs > 0 ? Animated.sequence([Animated.delay(delayMs), loop]) : loop;
    animation.start();
    return () => animation.stop();
  }, [active, delayMs, duration, value]);

  return value;
}

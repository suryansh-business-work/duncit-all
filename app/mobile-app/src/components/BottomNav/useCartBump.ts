import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { selectCartCount, useCartStore } from '@/stores/cart.store';

/** Up, then back — under half a second in all. */
const LIFT_MS = 150;
const SETTLE_MS = 250;
const LIFT_SCALE = 1.25;

/**
 * The scale the Cart tab's glyph is drawn at: 1 at rest, and a quick lift and
 * settle each time the cart's unit count goes UP — "something just landed
 * here". A decrement never plays it, nor does the saved cart being restored at
 * launch, nor anything at all for someone who asked the device for less motion.
 * Twin of mWeb's BottomNavIcon bump.
 */
export function useCartBump(): Animated.Value {
  const count = useCartStore(selectCartCount);
  const hydrated = useCartStore((s) => s.hydrated);
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef({ count, hydrated });

  useEffect(() => {
    const added = previous.current.hydrated && count > previous.current.count;
    previous.current = { count, hydrated };
    if (!added || reduceMotion) return undefined;
    const run = Animated.sequence([
      Animated.timing(scale, {
        toValue: LIFT_SCALE,
        duration: LIFT_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: SETTLE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    run.start();
    return () => {
      run.stop();
      scale.setValue(1);
    };
    // Only a change in the count plays it — not a change of the motion setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, hydrated]);

  return scale;
}

import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Measures the rendered height of an element and hands back the `onLayout` to
 * attach to it.
 *
 * Used for the overlaid bottom bars — the pod booking bar and the survey
 * footer — so the scroll behind them can reserve exactly the space they
 * occupy. A constant cannot do this correctly: the booking bar swaps between
 * several states (host, member, backout-in-process, closed, and the taller
 * book bar with its seat stepper), each a different height, so any single
 * number is wrong for some of them and clips the last row of content.
 *
 * Reach for this only when something really does float over the scroll. A
 * screen whose content merely has to clear the navigation bar wants
 * `useBottomInset()` instead — measuring a bar that does not exist reserves 0.
 *
 * The measured height already includes whatever safe-area padding the bar
 * applies internally, so callers should not add the bottom inset again.
 */
export function useMeasuredHeight(): {
  height: number;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const [height, setHeight] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    // Layout fires on every re-render; only commit real changes so this never
    // loops (a fractional wobble on some densities would otherwise re-render
    // forever).
    setHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, []);

  return { height, onLayout };
}

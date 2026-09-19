import { useRef, type PointerEvent } from 'react';

/** How far a finger must travel sideways before it counts as a swipe. */
const SWIPE_PX = 40;

/**
 * Pointer handlers that turn a sideways swipe into previous / next. The frame
 * they go on sets `touch-action: pan-y pinch-zoom`, so the page still scrolls
 * and zooms while a horizontal drag reaches these handlers instead.
 */
export function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = event.clientX - from.x;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(event.clientY - from.y)) return;
      (dx < 0 ? onNext : onPrev)();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

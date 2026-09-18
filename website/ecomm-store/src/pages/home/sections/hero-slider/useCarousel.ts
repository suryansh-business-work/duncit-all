import { useCallback, useEffect, useState, type FocusEvent } from 'react';
import { useMediaQuery } from '@mui/material';

const INTERVAL_MS = 6000;

/**
 * Carousel state: which slide shows, and whether it advances on its own.
 * Autoplay never starts for someone who asked for reduced motion, stops while
 * the pointer or keyboard focus is inside, and can be paused outright
 * (WCAG 2.2.2).
 */
export function useCarousel(count: number) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const playing = count > 1 && !reducedMotion && !paused && !hovered && !focused;

  const goTo = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = globalThis.setInterval(next, INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [playing, next]);

  return {
    index,
    playing,
    paused,
    canAutoplay: count > 1 && !reducedMotion,
    goTo,
    next,
    prev,
    togglePaused: () => setPaused((p) => !p),
    bind: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      },
    },
  };
}

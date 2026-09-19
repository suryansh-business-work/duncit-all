import { useEffect, useState, type FocusEvent } from 'react';
import { useMediaQuery } from '@mui/material';

import { useCarouselIndex } from '../../../../lib/useCarouselIndex';

const INTERVAL_MS = 6000;

/**
 * Carousel state: which slide shows, and whether it advances on its own.
 * Autoplay never starts for someone who asked for reduced motion, stops while
 * the pointer or keyboard focus is inside, and can be paused outright
 * (WCAG 2.2.2). An explicit Play runs even with the pointer or focus inside —
 * the button is inside the carousel, so it would otherwise seem dead — and an
 * explicit Pause always stops it.
 */
export function useCarousel(count: number) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { index, goTo, next, prev } = useCarouselIndex(count);
  const [paused, setPaused] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const idle = !hovered && !focused;
  const playing = count > 1 && !reducedMotion && !paused && (resumed || idle);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = globalThis.setInterval(next, INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [playing, next]);

  const togglePaused = () => {
    if (paused) {
      setPaused(false);
      setResumed(true);
    } else {
      setPaused(true);
      setResumed(false);
    }
  };

  return {
    index,
    playing,
    paused,
    canAutoplay: count > 1 && !reducedMotion,
    goTo,
    next,
    prev,
    togglePaused,
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

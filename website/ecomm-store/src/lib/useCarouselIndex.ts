import { useCallback, useState } from 'react';

/** Which of `count` slides shows, with previous / next that wrap around the ends. */
export function useCarouselIndex(count: number) {
  const [index, setIndex] = useState(0);
  const goTo = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  return { index, goTo, next, prev };
}

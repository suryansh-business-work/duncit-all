/** Horizontal swipe → intent, given the gesture's net x-distance (dx in px).
 * Swiping left (negative dx) advances to the next item; swiping right goes back.
 * Movement shorter than `threshold` is treated as a tap, not a swipe. */
export function resolveSwipe(dx: number, threshold = 48): 'next' | 'prev' | null {
  if (dx <= -threshold) return 'next';
  if (dx >= threshold) return 'prev';
  return null;
}

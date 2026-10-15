/**
 * How much a screen laid out for `designHeight` must shrink (or may grow) to
 * fit `available` height without scrolling.
 *
 * Only part of a screen can shrink: a button keeps its touch target and a
 * caption keeps its text size. `fixed` is that part, so the ratio is taken
 * over what CAN scale — scaling the whole design by `available / designHeight`
 * would leave the screen taller than the window whenever anything is fixed.
 *
 * The result is clamped to `[min, max]`: below `min` the text stops being
 * readable, so a screen that still does not fit scrolls instead.
 *
 * A non-finite input, or a design that is all fixed, has nothing to scale and
 * returns `max` (the design as drawn).
 */
export function fitScale(
  available: number,
  designHeight: number,
  min: number,
  max: number,
  fixed = 0,
): number {
  const flexible = designHeight - fixed;
  if (!Number.isFinite(available) || !Number.isFinite(flexible) || flexible <= 0) return max;
  const ratio = (available - fixed) / flexible;
  return Math.min(max, Math.max(min, ratio));
}

/**
 * A design size at `scale`, rounded to a whole pixel and never under `floor`
 * — the smallest size that size may take (a heading stays a heading).
 */
export function fitSize(base: number, scale: number, floor = 0): number {
  return Math.max(floor, Math.round(base * scale));
}

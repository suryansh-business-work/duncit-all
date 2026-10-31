/**
 * Scatter for occasion decoration. Snow and sparks need to look random, not be
 * unpredictable, so everything here is seeded: the same look on the same
 * screen scatters the same way, which keeps tests exact and a re-render calm.
 */

/** The fill used when a layer gives no colours at all — white reads on every festive palette. */
export const FALLBACK_MARK_COLOR = '#FFFFFF';

/** A small seeded generator (mulberry32). Decoration needs scatter, not security. */
export function occasionRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 0–1 value for an integer and a salt: the n-th burst or bulb always lands the same. */
export function hash01(n: number, salt: number): number {
  return occasionRandom(Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b))();
}

/** The colour at `unit` (0–1) through the list; the fallback for an empty one. */
export function pickColor(colors: readonly string[], unit: number): string {
  return colors[Math.min(colors.length - 1, Math.floor(unit * colors.length))] ?? FALLBACK_MARK_COLOR;
}

/** The n-th colour, cycling through the list; the fallback for an empty one. */
export function cycleColor(colors: readonly string[], n: number): string {
  return colors[n % colors.length] ?? FALLBACK_MARK_COLOR;
}

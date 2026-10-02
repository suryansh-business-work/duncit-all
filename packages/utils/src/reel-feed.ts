/**
 * The Explore reel feed, shared by mWeb and the native app (rules 27/40): a
 * random order that never runs out.
 *
 * Each pass through the pods is one "cycle", shuffled on its own. When the
 * viewer nears the end, the surface asks for one more cycle, so swiping past
 * the last reel carries on into a fresh shuffle instead of stopping.
 *
 * The order comes from a hash of `seed` + cycle + the pod's key, not from
 * `Math.random()` per render: a feed that refetches (a like, a save) keeps
 * every reel exactly where the viewer left it. A new `seed` — a new visit —
 * deals a new order.
 */

/** One slot in the feed. `key` stays unique when the same pod comes round again. */
export interface ReelFeedEntry<T> {
  key: string;
  item: T;
}

/** Reels kept loading ahead of (and behind) the one on screen. */
export const REEL_PRELOAD_DISTANCE = 2;

/** FNV-1a — a cheap, well-spread rank for a string. */
function rank(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    // A one-character string always has a code point at 0.
    hash ^= char.codePointAt(0) as number;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function shuffleCycle<T>(items: readonly T[], keyOf: (item: T) => string, salt: string): T[] {
  return items
    .map((item) => ({ item, order: rank(`${salt}:${keyOf(item)}`) }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

/**
 * `cycles` shuffled passes over `items`, one after another. Where a pass would
 * open on the reel the previous one closed on, it is rotated by one, so the
 * same reel never plays twice in a row.
 */
export function reelFeed<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  seed: number,
  cycles: number
): ReelFeedEntry<T>[] {
  const feed: ReelFeedEntry<T>[] = [];
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const pass = shuffleCycle(items, keyOf, `${seed}:${cycle}`);
    const previous = feed[feed.length - 1]?.item;
    if (pass.length > 1 && pass[0] === previous) pass.push(pass.shift() as T);
    for (const item of pass) feed.push({ key: `${keyOf(item)}~${cycle}`, item });
  }
  return feed;
}

/** Whether the viewer is close enough to the end that the next cycle should be dealt. */
export function shouldExtendReelFeed(activeIndex: number, length: number): boolean {
  return activeIndex >= length - 1 - REEL_PRELOAD_DISTANCE;
}

/** Whether the reel at `index` should be loading while `activeIndex` is on screen. */
export function isReelPreloaded(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) <= REEL_PRELOAD_DISTANCE;
}

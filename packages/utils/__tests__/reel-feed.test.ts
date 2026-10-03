import { describe, expect, it } from 'vitest';
import {
  isReelPreloaded,
  reelFeed,
  REEL_PRELOAD_DISTANCE,
  shouldExtendReelFeed,
} from '../src/reel-feed';

const pods = ['DUN-POD-4821', 'DUN-POD-4822', 'DUN-POD-4823', 'DUN-POD-4824'].map((id) => ({ id }));
const keyOf = (pod: { id: string }) => pod.id;

describe('reelFeed', () => {
  it('deals every pod once per cycle, with keys unique across cycles', () => {
    const feed = reelFeed(pods, keyOf, 1727950000000, 3);
    expect(feed).toHaveLength(12);
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const pass = feed.slice(cycle * 4, cycle * 4 + 4).map((entry) => entry.item.id);
      expect([...pass].sort((a, b) => a.localeCompare(b))).toEqual(pods.map(keyOf));
    }
    expect(new Set(feed.map((entry) => entry.key)).size).toBe(12);
    expect(feed[0]?.key).toMatch(/~0$/);
  });

  it('keeps the same order for the same seed, so a refetch moves nothing', () => {
    expect(reelFeed(pods, keyOf, 42, 2)).toEqual(reelFeed([...pods], keyOf, 42, 2));
  });

  it('deals a different order for a different visit', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        reelFeed(pods, keyOf, seed, 1)
          .map((entry) => entry.item.id)
          .join(',')
      )
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('never plays the same reel twice in a row across a cycle seam', () => {
    const two = pods.slice(0, 2);
    for (let seed = 0; seed < 50; seed += 1) {
      const feed = reelFeed(two, keyOf, seed, 6);
      feed.slice(1).forEach((entry, index) => {
        expect(entry.item).not.toBe(feed[index]?.item);
      });
    }
  });

  it('repeats a lone reel, and deals nothing for no pods or no cycles', () => {
    expect(reelFeed(pods.slice(0, 1), keyOf, 7, 3).map((entry) => entry.key)).toEqual([
      'DUN-POD-4821~0',
      'DUN-POD-4821~1',
      'DUN-POD-4821~2',
    ]);
    expect(reelFeed([], keyOf, 7, 3)).toEqual([]);
    expect(reelFeed(pods, keyOf, 7, 0)).toEqual([]);
  });
});

describe('shouldExtendReelFeed', () => {
  it('asks for the next cycle once the viewer is within the preload distance of the end', () => {
    expect(shouldExtendReelFeed(0, 10)).toBe(false);
    expect(shouldExtendReelFeed(10 - 1 - REEL_PRELOAD_DISTANCE, 10)).toBe(true);
    expect(shouldExtendReelFeed(0, 1)).toBe(true);
  });
});

describe('isReelPreloaded', () => {
  it('loads the reels within the preload distance on either side', () => {
    expect(isReelPreloaded(5, 5)).toBe(true);
    expect(isReelPreloaded(7, 5)).toBe(true);
    expect(isReelPreloaded(3, 5)).toBe(true);
    expect(isReelPreloaded(8, 5)).toBe(false);
    expect(isReelPreloaded(2, 5)).toBe(false);
  });
});

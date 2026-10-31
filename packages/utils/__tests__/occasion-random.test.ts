import { describe, expect, it } from 'vitest';
import { FALLBACK_MARK_COLOR, cycleColor, hash01, occasionRandom, pickColor } from '../src/occasion-random';

describe('occasionRandom', () => {
  it('replays the same sequence for the same seed and a different one for another seed', () => {
    const a = occasionRandom(42);
    const b = occasionRandom(42);
    const first = [a(), a(), a()];

    expect([b(), b(), b()]).toEqual(first);
    expect(occasionRandom(43)()).not.toBe(first[0]);
  });

  it('stays inside [0, 1)', () => {
    const next = occasionRandom(7);
    for (let i = 0; i < 500; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('hash01', () => {
  it('gives the same value for the same input and spreads neighbouring inputs apart', () => {
    expect(hash01(3, 1)).toBe(hash01(3, 1));
    expect(hash01(3, 1)).not.toBe(hash01(4, 1));
    expect(hash01(3, 1)).not.toBe(hash01(3, 2));
  });
});

describe('pickColor', () => {
  it('maps 0–1 onto the list, the top end landing on the last colour', () => {
    const colors = ['#111111', '#222222', '#333333'];

    expect(pickColor(colors, 0)).toBe('#111111');
    expect(pickColor(colors, 0.5)).toBe('#222222');
    expect(pickColor(colors, 1)).toBe('#333333');
  });

  it('falls back to white for an empty list rather than painting nothing', () => {
    expect(pickColor([], 0.3)).toBe(FALLBACK_MARK_COLOR);
  });
});

describe('cycleColor', () => {
  it('cycles through the list and falls back for an empty one', () => {
    expect([0, 1, 2, 3].map((n) => cycleColor(['#AA0000', '#00AA00'], n))).toEqual(['#AA0000', '#00AA00', '#AA0000', '#00AA00']);
    expect(cycleColor([], 5)).toBe(FALLBACK_MARK_COLOR);
  });
});

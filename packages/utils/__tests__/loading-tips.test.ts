import { describe, expect, it } from 'vitest';
import {
  LOADING_TIP_INTERVAL_MS,
  LOADING_TIP_KEYS,
  LOADING_TIP_TITLE_KEY,
  loadingTipKeyAt,
  nextLoadingTipIndex,
} from '../src/loading-tips';

describe('the loading tips', () => {
  it('are literal mWeb keys, each listed once, under the title key', () => {
    expect(LOADING_TIP_TITLE_KEY).toBe('mweb.loadingTips.title');
    expect(LOADING_TIP_KEYS.length).toBeGreaterThan(1);
    expect(new Set(LOADING_TIP_KEYS).size).toBe(LOADING_TIP_KEYS.length);
    for (const key of LOADING_TIP_KEYS) expect(key).toMatch(/^mweb\.loadingTips\.tip\w+$/);
  });

  it('stay up long enough to read', () => {
    expect(LOADING_TIP_INTERVAL_MS).toBe(4000);
  });
});

describe('nextLoadingTipIndex', () => {
  it('steps to the next tip and wraps from the last back to the first', () => {
    const count = LOADING_TIP_KEYS.length;
    expect(nextLoadingTipIndex(0)).toBe(1);
    expect(nextLoadingTipIndex(count - 2)).toBe(count - 1);
    expect(nextLoadingTipIndex(count - 1)).toBe(0);
  });

  it('honours a list length the caller passes', () => {
    expect(nextLoadingTipIndex(1, 3)).toBe(2);
    expect(nextLoadingTipIndex(2, 3)).toBe(0);
    expect(nextLoadingTipIndex(0, 1)).toBe(0);
  });

  it('starts over at the first tip from a position that is not a whole number in range', () => {
    expect(nextLoadingTipIndex(Number.NaN, 3)).toBe(0);
    expect(nextLoadingTipIndex(-1, 3)).toBe(0);
    expect(nextLoadingTipIndex(1.5, 3)).toBe(0);
    // Stale after the list shrank.
    expect(nextLoadingTipIndex(3, 3)).toBe(0);
    expect(nextLoadingTipIndex(9, 3)).toBe(0);
  });

  it('always answers 0 for an empty or negative-length list', () => {
    expect(nextLoadingTipIndex(0, 0)).toBe(0);
    expect(nextLoadingTipIndex(2, -1)).toBe(0);
  });
});

describe('loadingTipKeyAt', () => {
  it('reads the tip at a position', () => {
    expect(loadingTipKeyAt(0)).toBe(LOADING_TIP_KEYS[0]);
    expect(loadingTipKeyAt(2)).toBe(LOADING_TIP_KEYS[2]);
  });

  it('wraps a position past the end into the list', () => {
    expect(loadingTipKeyAt(LOADING_TIP_KEYS.length)).toBe(LOADING_TIP_KEYS[0]);
    expect(loadingTipKeyAt(LOADING_TIP_KEYS.length + 1)).toBe(LOADING_TIP_KEYS[1]);
  });

  it('falls back to the first tip for a negative, fractional or NaN position', () => {
    expect(loadingTipKeyAt(-1)).toBe(LOADING_TIP_KEYS[0]);
    expect(loadingTipKeyAt(0.5)).toBe(LOADING_TIP_KEYS[0]);
    expect(loadingTipKeyAt(Number.NaN)).toBe(LOADING_TIP_KEYS[0]);
  });
});

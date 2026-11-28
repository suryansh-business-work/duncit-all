import { describe, expect, it, vi } from 'vitest';
import { isTabEntry, scrollToTop } from '../src/screen-scroll';

describe('scrollToTop', () => {
  it('scrolls a ScrollView to the top without animating by default', () => {
    const scrollTo = vi.fn();
    expect(scrollToTop({ scrollTo })).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });
  });

  it('scrolls a FlatList by offset, and prefers it over scrollTo when a list has both', () => {
    const scrollTo = vi.fn();
    const scrollToOffset = vi.fn();
    expect(scrollToTop({ scrollTo, scrollToOffset }, true)).toBe(true);
    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('reports false for a view that is not mounted or cannot scroll', () => {
    expect(scrollToTop(null)).toBe(false);
    expect(scrollToTop(undefined)).toBe(false);
    expect(scrollToTop({})).toBe(false);
  });
});

describe('isTabEntry', () => {
  const routes = [{ key: 'home-1' }, { key: 'leads-2' }, { key: 'more-3' }];

  it('is true when the active tab moves to this tab', () => {
    expect(isTabEntry(0, { index: 1, routes }, 'leads-2')).toBe(true);
  });

  it('is false for the tab being left and for tabs not involved', () => {
    expect(isTabEntry(0, { index: 1, routes }, 'home-1')).toBe(false);
    expect(isTabEntry(0, { index: 1, routes }, 'more-3')).toBe(false);
  });

  // Coming Back from a pushed screen, or a param change on the same tab,
  // leaves the index where it was: that tab keeps its place.
  it('is false when the active tab did not change', () => {
    expect(isTabEntry(1, { index: 1, routes }, 'leads-2')).toBe(false);
  });

  it('is false before any earlier state is known (the first render)', () => {
    expect(isTabEntry(undefined, { index: 1, routes }, 'leads-2')).toBe(false);
  });

  it('is false when the index points past the routes (a tab removed mid-update)', () => {
    expect(isTabEntry(0, { index: 5, routes }, 'leads-2')).toBe(false);
  });
});

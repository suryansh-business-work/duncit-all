import { describe, expect, it } from 'vitest';
import { clampAlpha, hexToRgb, withAlpha } from '../src/color';

// The brand red the app's tonal fills were hand-typed from (rgba(255, 87, 87, …)).
const BRAND_RED = '#FF5757';

describe('clampAlpha', () => {
  it('passes an in-range alpha through unchanged', () => {
    expect(clampAlpha(0.12)).toBe(0.12);
    expect(clampAlpha(0)).toBe(0);
    expect(clampAlpha(1)).toBe(1);
  });

  it('clamps below 0 up to 0', () => {
    expect(clampAlpha(-0.4)).toBe(0);
  });

  it('clamps above 1 down to 1', () => {
    expect(clampAlpha(2.5)).toBe(1);
  });
});

describe('hexToRgb', () => {
  it('parses a #rrggbb colour', () => {
    expect(hexToRgb(BRAND_RED)).toEqual([255, 87, 87]);
    expect(hexToRgb('#2E7D32')).toEqual([46, 125, 50]);
  });

  it('expands the #rgb short form', () => {
    expect(hexToRgb('#f57')).toEqual([255, 85, 119]);
  });

  it('ignores the alpha byte of a #rrggbbaa colour', () => {
    expect(hexToRgb('#FF5757CC')).toEqual([255, 87, 87]);
  });

  it('returns null for anything that is not a hex literal', () => {
    expect(hexToRgb('rgb(255, 87, 87)')).toBeNull();
    expect(hexToRgb('$primary')).toBeNull();
  });

  it('returns null for a hex body too short to be a colour', () => {
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb('#ff')).toBeNull();
  });

  it('returns null when the body does not parse as hex at all', () => {
    expect(hexToRgb('#zzzzzz')).toBeNull();
  });
});

describe('withAlpha', () => {
  it('renders a hex colour as rgba at the given alpha', () => {
    expect(withAlpha(BRAND_RED, 0.12)).toBe('rgba(255, 87, 87, 0.12)');
  });

  it('clamps the alpha into 0…1', () => {
    expect(withAlpha(BRAND_RED, 4)).toBe('rgba(255, 87, 87, 1)');
    expect(withAlpha(BRAND_RED, -1)).toBe('rgba(255, 87, 87, 0)');
  });

  it('hands back anything it cannot parse untouched', () => {
    expect(withAlpha('$primary', 0.12)).toBe('$primary');
    expect(withAlpha('var(--duncit-primary)', 0.5)).toBe('var(--duncit-primary)');
  });
});

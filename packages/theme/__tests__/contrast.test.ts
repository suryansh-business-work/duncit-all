import { describe, it, expect } from 'vitest';
import {
  AA_TEXT,
  contrastRatio,
  darkerThan,
  ensureContrast,
  fillForWhite,
  luminance,
  mix,
  textOn,
} from '../src/contrast';

const WHITE = '#ffffff';
const BLACK = '#000000';

describe('luminance / contrastRatio', () => {
  it('spans 0 (black) to 1 (white) and reads #rgb shorthand', () => {
    expect(luminance(BLACK)).toBe(0);
    expect(luminance(WHITE)).toBe(1);
    expect(luminance('#fff')).toBe(1);
  });

  it('is symmetric and matches the published WCAG ratios', () => {
    expect(contrastRatio(BLACK, WHITE)).toBe(21);
    expect(contrastRatio('#d92d2d', WHITE)).toBeCloseTo(4.81, 2);
    expect(contrastRatio(WHITE, '#d92d2d')).toBeCloseTo(4.81, 2);
  });
});

describe('mix', () => {
  it('moves a colour toward a target by weight', () => {
    expect(mix('#ff0000', BLACK, 0)).toBe('#ff0000');
    expect(mix('#ff0000', BLACK, 0.5)).toBe('#800000');
    expect(mix('#ff0000', WHITE, 1)).toBe(WHITE);
  });
});

describe('ensureContrast', () => {
  it('returns an accent that already clears the threshold unchanged', () => {
    expect(ensureContrast('#4f46e5', BLACK, [WHITE])).toBe('#4f46e5');
  });

  it('darkens a light accent until it clears 4.5:1 on every ground', () => {
    const grounds = [WHITE, '#f8fafc', '#f1f5f9'];
    const safe = ensureContrast('#0ea5e9', BLACK, grounds);
    expect(safe).not.toBe('#0ea5e9');
    for (const ground of grounds) {
      expect(contrastRatio(safe, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('lightens a dark accent for a dark page', () => {
    const safe = ensureContrast('#123456', WHITE, ['#0b1220', '#111a2e']);
    expect(contrastRatio(safe, '#111a2e')).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('stops at the target when no mix can reach the threshold', () => {
    expect(ensureContrast('#777777', WHITE, ['#808080'])).toBe(WHITE);
  });
});

describe('fillForWhite / darkerThan', () => {
  it('makes any accent a fill white text clears', () => {
    expect(contrastRatio(WHITE, fillForWhite('#f97316'))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps the portal's own state colour when it is already darker", () => {
    expect(darkerThan('#c62226', '#d92d2d')).toBe('#c62226');
  });

  it('steps the rest fill darker when the given state colour is not', () => {
    const hover = darkerThan(WHITE, '#123456');
    expect(luminance(hover)).toBeLessThan(luminance('#123456'));
  });
});

describe('textOn', () => {
  it('prefers white and falls back to the dark ink on a light fill', () => {
    expect(textOn('#d92d2d', '#111827')).toBe(WHITE);
    expect(textOn('#ff9e9e', '#111827')).toBe('#111827');
  });
});

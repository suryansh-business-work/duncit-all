import { describe, expect, it } from 'vitest';
import raw from '../tokens.json';
import cjsTokens from '../tokens.cjs';
import esmTokens, {
  auth,
  brand,
  dark,
  light,
  neutral,
  radii,
  semantic,
  surface,
  typography,
} from '../tokens.mjs';

describe('@duncit/auth-tokens ESM view (tokens.mjs)', () => {
  it('default export is the whole tokens.json data source', () => {
    expect(esmTokens).toEqual(raw);
  });

  it('re-exports every top-level group as a named export bound to the JSON', () => {
    expect(brand).toBe(raw.brand);
    expect(neutral).toBe(raw.neutral);
    expect(semantic).toBe(raw.semantic);
    expect(surface).toBe(raw.surface);
    expect(light).toBe(raw.light);
    expect(dark).toBe(raw.dark);
    expect(auth).toBe(raw.auth);
    expect(radii).toBe(raw.radii);
    expect(typography).toBe(raw.typography);
  });

  it('exposes concrete token values (spot-check across scales and modes)', () => {
    expect(brand[500]).toBe('#ff5757');
    expect(light.onPrimary).toBe('#ffffff');
    expect(dark.bg).toBe('#0e1012');
    expect(radii.pill).toBe(999);
    expect(auth.avatars).toHaveLength(3);
    expect(typography.weight.bold).toBe(700);
  });

  it('splits the CTA fill, the red text colour and the decorative brand red (WCAG AA)', () => {
    expect(light.primary).toBe('#d92d2d');
    expect(light.primaryHover).toBe('#c62226');
    expect(light.primaryActive).toBe('#b42323');
    expect(light.accent).toBe('#c62226');
    expect(dark.accent).toBe('#ff4d4f');
    expect(dark.onAccent).toBe('#0e1012');
    expect(light.brand).toBe('#f82c2e');
    expect(dark.brand).toBe('#f82c2e');
  });

  it('keeps mode-aware status colours beside the mode-less semantic group', () => {
    expect(semantic.error).toBe('#dc2626');
    expect(light.error).toBe('#c62828');
    expect(dark.error).toBe('#f87171');
    expect(light.onSemantic).toBe('#ffffff');
    expect(dark.onSemantic).toBe('#0e1012');
  });

  it('gives both modes the same keys, so a theme can swap the object', () => {
    expect(Object.keys(dark).sort((a, b) => a.localeCompare(b))).toEqual(
      Object.keys(light).sort((a, b) => a.localeCompare(b))
    );
  });
});

describe('the login landing fit and hero scrim (auth.fit, auth.hero.scrim)', () => {
  const { fit, hero } = auth;

  it('leaves part of the landing free to scale — a design that is all fixed could never fit', () => {
    expect(fit.fixedHeight).toBeGreaterThan(0);
    expect(fit.fixedHeight).toBeLessThan(fit.designHeight);
  });

  it('scales within a readable range that never grows past the design', () => {
    expect(fit.minScale).toBeGreaterThan(0);
    expect(fit.minScale).toBeLessThanOrEqual(fit.maxScale);
    expect(fit.maxScale).toBeLessThanOrEqual(1);
  });

  it('keeps every text floor at or under its design size, and at a readable size', () => {
    expect(fit.titleMinSize).toBeLessThanOrEqual(fit.titleSize);
    expect(fit.subtitleMinSize).toBeLessThanOrEqual(fit.subtitleSize);
    expect(fit.subtitleMinSize).toBeGreaterThanOrEqual(12);
    // A heading stays bigger than the line under it at every scale.
    expect(fit.titleMinSize).toBeGreaterThan(fit.subtitleSize);
  });

  it('sizes the logo, the hero room and the rhythm in whole pixels, and a provider mark inside its button', () => {
    for (const size of [fit.designHeight, fit.fixedHeight, fit.heroRoom, fit.logoSize, fit.gap]) {
      expect(Number.isInteger(size)).toBe(true);
      expect(size).toBeGreaterThan(0);
    }
    expect(fit.socialIconRatio).toBeGreaterThan(0);
    expect(fit.socialIconRatio).toBeLessThan(1);
  });

  it('fades the scrim from clear to the dark ground at 90%, one colour throughout', () => {
    const rgba = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/;
    const clear = rgba.exec(hero.scrim.clear);
    const ground = rgba.exec(hero.scrim.ground);
    expect(clear?.[4]).toBe('0');
    expect(ground?.[4]).toBe('0.9');
    expect(clear?.slice(1, 4)).toEqual(ground?.slice(1, 4));
  });
});

describe('@duncit/auth-tokens CJS view (tokens.cjs)', () => {
  it('exports the identical tokens.json data source', () => {
    expect(cjsTokens).toEqual(raw);
  });

  it('agrees with the ESM default export (dual-format parity)', () => {
    expect(cjsTokens).toEqual(esmTokens);
  });
});

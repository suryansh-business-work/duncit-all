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
    expect(dark.bg).toBe('#0b1220');
    expect(radii.pill).toBe(999);
    expect(auth.avatars).toHaveLength(3);
    expect(typography.weight.bold).toBe(700);
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

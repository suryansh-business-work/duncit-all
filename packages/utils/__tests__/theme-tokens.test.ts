import { describe, expect, it } from 'vitest';
import { applyTokenOverrides, resolveThemeTokens, type ThemePalettes } from '../src/theme-tokens';

interface Palette {
  primary: string;
  background: string;
  text: string;
}

const LIGHT: Palette = { primary: '#D92D2D', background: '#FFFFFF', text: '#1A1A1A' };
const DARK: Palette = { primary: '#F25A5A', background: '#121212', text: '#F5F5F5' };
const LOCAL: ThemePalettes<Palette> = { light: LIGHT, dark: DARK };

describe('applyTokenOverrides', () => {
  it('hands back an unchanged copy when the admin saved no overrides', () => {
    for (const none of [undefined, null]) {
      const next = applyTokenOverrides(LIGHT, none);
      expect(next).toEqual(LIGHT);
      // A copy, so a caller mutating it cannot corrupt the bundled palette.
      expect(next).not.toBe(LIGHT);
    }
  });

  it('writes each filled-in token, trimmed, and keeps the bundled value for blank, null or missing ones', () => {
    const next = applyTokenOverrides(LIGHT, { primary: '  #B71C1C ', background: '   ', text: null });

    expect(next).toEqual({ primary: '#B71C1C', background: '#FFFFFF', text: '#1A1A1A' });
  });

  it('ignores keys the palette does not have', () => {
    const overrides = { primary: '#B71C1C', accent: '#00FF00' } as Record<string, string>;

    expect(applyTokenOverrides(LIGHT, overrides)).toEqual({ ...LIGHT, primary: '#B71C1C' });
  });
});

describe('resolveThemeTokens', () => {
  it('returns the bundled palettes by reference unless the source is SERVER', () => {
    expect(resolveThemeTokens(LOCAL)).toBe(LOCAL);
    expect(resolveThemeTokens(LOCAL, null)).toBe(LOCAL);
    expect(
      resolveThemeTokens(LOCAL, {
        theme_token_source: 'LOCAL',
        theme_tokens_light: { primary: '#B71C1C' },
      })
    ).toBe(LOCAL);
  });

  it('lays the light and dark overrides over their own palettes when the source is SERVER', () => {
    const resolved = resolveThemeTokens(LOCAL, {
      theme_token_source: 'SERVER',
      theme_tokens_light: { primary: '#B71C1C' },
      theme_tokens_dark: null,
    });

    expect(resolved.light).toEqual({ ...LIGHT, primary: '#B71C1C' });
    expect(resolved.dark).toEqual(DARK);
    expect(resolved).not.toBe(LOCAL);
  });
});

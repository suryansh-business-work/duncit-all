import { describe, it, expect } from 'vitest';
import { modeColors } from '../src/mode-colors';
import { buildThemeCtx } from '../src/context';
import { tokens } from '../src/tokens';
import { AA_TEXT, contrastRatio, luminance } from '../src/contrast';

/** The CRM portal's indigo: its `main` is 4.47:1 under white, just short of AA. */
const indigo = { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' };

describe('modeColors', () => {
  it('gives a React Native console exactly the colours the MUI theme is built from', () => {
    for (const mode of ['light', 'dark'] as const) {
      const colors = modeColors(mode, indigo);
      const ctx = buildThemeCtx(mode, indigo);
      for (const [key, value] of Object.entries(colors)) {
        expect(ctx[key as keyof typeof ctx], `${mode}.${key}`).toEqual(value);
      }
    }
  });

  it('lightens the accent for text on every dark ground and keeps it dark enough on the light ones', () => {
    const dark = modeColors('dark', indigo);
    for (const ground of [tokens.dark.bg, tokens.dark.surface, tokens.dark.soft, tokens.dark.raised]) {
      expect(contrastRatio(dark.primary, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    }
    expect(luminance(dark.primary)).toBeGreaterThan(luminance(indigo.main));
    expect(dark.onPrimary).toBe(tokens.neutral[900]);

    const light = modeColors('light', indigo);
    for (const ground of [tokens.surface.paper, tokens.surface.bg, tokens.surface.soft]) {
      expect(contrastRatio(light.primary, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('fills under white text in both modes, with hover and pressed steps that only get darker', () => {
    for (const mode of ['light', 'dark'] as const) {
      const c = modeColors(mode, indigo);
      expect(contrastRatio(c.white, c.primaryFill)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(luminance(c.primaryHover)).toBeLessThan(luminance(c.primaryFill));
      expect(luminance(c.primaryActive)).toBeLessThan(luminance(c.primaryHover));
    }
  });

  it('takes the light surfaces from the surface tokens and the dark ones from the dark tokens', () => {
    expect(modeColors('light', indigo)).toMatchObject({
      bg: tokens.surface.bg,
      surface: tokens.surface.paper,
      soft: tokens.surface.soft,
      raised: tokens.surface.raised,
      ink: tokens.neutral[900],
      onSemantic: tokens.common.white,
    });
    expect(modeColors('dark', indigo)).toMatchObject({
      bg: tokens.dark.bg,
      surface: tokens.dark.surface,
      soft: tokens.dark.soft,
      raised: tokens.dark.raised,
      ink: tokens.dark.ink,
      semantic: tokens.dark.semantic,
      onSemantic: tokens.neutral[900],
    });
  });
});

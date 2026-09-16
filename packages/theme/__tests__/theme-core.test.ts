import { describe, it, expect } from 'vitest';
import { tokens } from '../src/tokens';
import { buildThemeCtx } from '../src/context';
import { buildPalette } from '../src/palette';
import { buildTypography } from '../src/typography';
import { createDuncitTheme, buildTheme } from '../src/createDuncitTheme';
import { buildComponents } from '../src/components';
import { AA_TEXT, contrastRatio, luminance } from '../src/contrast';
import type { AccentColors } from '../src/types';

const brand: AccentColors = {
  light: '#a5b4fc',
  main: '#4f46e5',
  hover: '#4338ca',
  active: '#3730a3',
};

describe('tokens', () => {
  it('exposes the shared design primitives', () => {
    expect(tokens.common.white).toBe('#ffffff');
    expect(tokens.defaultAccent.main).toBe('#d92d2d');
    expect(tokens.radius.sm).toBe(6);
    expect(tokens.font.weight.bold).toBe(700);
  });
});

describe('buildTypography', () => {
  it('sources the font family and sizes from tokens', () => {
    const typo = buildTypography() as Record<string, { fontSize?: string }>;
    expect((typo as { fontFamily?: string }).fontFamily).toBe(tokens.font.family);
    expect(typo.body1.fontSize).toBe(tokens.font.size.body1);
  });
});

describe('buildThemeCtx', () => {
  it('derives light-mode surfaces from the neutral/surface tokens', () => {
    const ctx = buildThemeCtx('light', brand);
    expect(ctx.isDark).toBe(false);
    expect(ctx.ink).toBe(tokens.neutral[900]);
    expect(ctx.muted).toBe(tokens.surface.muted);
    expect(ctx.border).toBe(tokens.surface.border);
    expect(ctx.inputBorder).toBe(tokens.surface.inputBorder);
    expect(ctx.semantic).toBe(tokens.semantic);
    expect(ctx.onSemantic).toBe(tokens.common.white);
    expect(ctx.bg).toBe(tokens.surface.bg);
    expect(ctx.primary).toBe(brand.main);
    expect(ctx.primaryFill).toBe(brand.main);
    expect(ctx.onPrimary).toBe(tokens.common.white);
  });

  it('derives dark-mode surfaces from the dark tokens', () => {
    const ctx = buildThemeCtx('dark', brand);
    expect(ctx.isDark).toBe(true);
    expect(ctx.ink).toBe(tokens.dark.ink);
    expect(ctx.muted).toBe(tokens.dark.muted);
    expect(ctx.border).toBe(tokens.dark.border);
    expect(ctx.surface).toBe(tokens.dark.surface);
    expect(ctx.inputBorder).toBe(tokens.dark.inputBorder);
    expect(ctx.semantic).toBe(tokens.dark.semantic);
    expect(ctx.onSemantic).toBe(tokens.neutral[900]);
    expect(ctx.soft).toBe(tokens.dark.soft);
    expect(ctx.raised).toBe(tokens.dark.raised);
    expect(ctx.shadow.overlay).toContain('inset');
  });

  it('lifts the accent for text on a dark page and keeps the fill under white', () => {
    const ctx = buildThemeCtx('dark', brand);
    expect(contrastRatio(ctx.primary, tokens.dark.bg)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(ctx.primary, tokens.dark.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(ctx.onPrimary, ctx.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(ctx.primaryFill).toBe(brand.main);
  });

  it('makes an accent that fails white text AA-safe, with darker hover and pressed steps', () => {
    const sky: AccentColors = { light: '#94a3b8', main: '#0ea5e9', hover: '#0284c7', active: '#0369a1' };
    const ctx = buildThemeCtx('light', sky);
    const grounds = [tokens.surface.paper, tokens.surface.bg, tokens.surface.soft];
    for (const ground of grounds) {
      expect(contrastRatio(ctx.primary, ground)).toBeGreaterThanOrEqual(AA_TEXT);
    }
    for (const fill of [ctx.primaryFill, ctx.primaryHover, ctx.primaryActive]) {
      expect(contrastRatio(tokens.common.white, fill)).toBeGreaterThanOrEqual(AA_TEXT);
    }
    expect(luminance(ctx.primaryHover)).toBeLessThan(luminance(ctx.primaryFill));
    expect(luminance(ctx.primaryActive)).toBeLessThan(luminance(ctx.primaryHover));
  });
});

describe('buildPalette', () => {
  it('maps the context onto an MUI palette', () => {
    const ctx = buildThemeCtx('dark', brand);
    const palette = buildPalette(ctx) as {
      mode: string;
      primary: { main: string };
      background: { default: string; paper: string };
      accent: { main: string };
      brand: { main: string };
      error: { main: string; contrastText: string };
    };
    expect(palette.accent.main).toBe(ctx.primary);
    expect(palette.brand.main).toBe(brand.main);
    expect(palette.error).toEqual({ main: tokens.dark.semantic.error, contrastText: tokens.neutral[900] });
    expect(palette.mode).toBe('dark');
    expect(palette.primary.main).toBe(ctx.primary);
    expect(palette.background.paper).toBe(ctx.surface);
  });
});

describe('buildComponents', () => {
  it('assembles the shared overrides and merges an extend map', () => {
    const ctx = buildThemeCtx('light', brand);
    const components = buildComponents(ctx, () => ({ MuiSvgIcon: { defaultProps: {} } }));
    expect(components.MuiButton).toBeDefined();
    expect(components.MuiCard).toBeDefined();
    expect(components.MuiSvgIcon).toBeDefined();
  });

  it('works without an extend argument', () => {
    const ctx = buildThemeCtx('dark', brand);
    const components = buildComponents(ctx);
    expect(components.MuiTooltip).toBeDefined();
    expect(components.MuiSvgIcon).toBeUndefined();
  });
});

describe('createDuncitTheme', () => {
  it('builds a light theme with the default accent when called with no args', () => {
    const theme = createDuncitTheme();
    expect(theme.palette.mode).toBe('light');
    expect(contrastRatio(theme.palette.primary.main, tokens.surface.soft)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(theme.palette.brand.main).toBe(tokens.defaultAccent.main);
    expect(theme.shape.borderRadius).toBe(tokens.radius.sm);
  });

  it('builds a dark theme with a custom accent and an extend override', () => {
    const theme = createDuncitTheme('dark', brand, () => ({ MuiSvgIcon: { defaultProps: {} } }));
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBe(buildThemeCtx('dark', brand).primary);
    expect(theme.components?.MuiSvgIcon).toBeDefined();
  });

  it('exposes buildTheme as an alias of createDuncitTheme', () => {
    expect(buildTheme).toBe(createDuncitTheme);
  });
});

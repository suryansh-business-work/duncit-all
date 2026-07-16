import { describe, it, expect } from 'vitest';
import { tokens } from '../src/tokens';
import { buildThemeCtx } from '../src/context';
import { buildPalette } from '../src/palette';
import { buildTypography } from '../src/typography';
import { createDuncitTheme, buildTheme } from '../src/createDuncitTheme';
import { buildComponents } from '../src/components';
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
    expect(tokens.defaultAccent.main).toBe('#ff5757');
    expect(tokens.radius.sm).toBe(6);
    expect(tokens.font.weight.bold).toBe(800);
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
    expect(ctx.muted).toBe(tokens.neutral[500]);
    expect(ctx.border).toBe(tokens.surface.border);
    expect(ctx.bg).toBe(tokens.surface.bg);
    expect(ctx.primary).toBe(brand.main);
  });

  it('derives dark-mode surfaces from the dark tokens', () => {
    const ctx = buildThemeCtx('dark', brand);
    expect(ctx.isDark).toBe(true);
    expect(ctx.ink).toBe(tokens.dark.ink);
    expect(ctx.muted).toBe(tokens.dark.muted);
    expect(ctx.border).toBe(tokens.dark.border);
    expect(ctx.surface).toBe(tokens.dark.surface);
    expect(ctx.appBg).toContain('linear-gradient');
  });
});

describe('buildPalette', () => {
  it('maps the context onto an MUI palette', () => {
    const ctx = buildThemeCtx('dark', brand);
    const palette = buildPalette(ctx) as {
      mode: string;
      primary: { main: string };
      background: { default: string; paper: string };
    };
    expect(palette.mode).toBe('dark');
    expect(palette.primary.main).toBe(brand.main);
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
    expect(theme.palette.primary.main).toBe(tokens.defaultAccent.main);
    expect(theme.shape.borderRadius).toBe(tokens.radius.sm);
  });

  it('builds a dark theme with a custom accent and an extend override', () => {
    const theme = createDuncitTheme('dark', brand, () => ({ MuiSvgIcon: { defaultProps: {} } }));
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBe(brand.main);
    expect(theme.components?.MuiSvgIcon).toBeDefined();
  });

  it('exposes buildTheme as an alias of createDuncitTheme', () => {
    expect(buildTheme).toBe(createDuncitTheme);
  });
});

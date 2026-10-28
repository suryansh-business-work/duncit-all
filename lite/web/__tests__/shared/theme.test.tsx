import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@mui/material';
import { ThemeProvider, useColorScheme, type CssVarsTheme, type Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { brand, dark, light } from '@duncit/auth-tokens';
import { COLOR_SCHEME_ATTRIBUTE, COLOR_SCHEME_SELECTOR, MODE_STORAGE_KEY, buildLiteTheme, tint, tintAt } from '../../../shared/theme';
import { LITE_RADII, LITE_SCHEMES } from '../../../shared/tokens';

/** A theme built with `cssVariables` carries its colour schemes; the plain `Theme` type does not say so. */
const isCssVarsTheme = (value: Theme): value is Theme & CssVarsTheme => 'colorSchemes' in value && 'cssVarPrefix' in value;

const liteTheme = (): Theme & CssVarsTheme => {
  const built = buildLiteTheme();
  if (!isCssVarsTheme(built)) throw new Error('buildLiteTheme() is not a CSS-variables theme');
  return built;
};

describe('buildLiteTheme', () => {
  const theme = liteTheme();

  it('carries both colour schemes as CSS variables, dark first', () => {
    expect(theme.defaultColorScheme).toBe('dark');
    expect(Object.keys(theme.colorSchemes).sort()).toEqual(['dark', 'light']);
    expect(theme.cssVarPrefix).toBe('lite');
  });

  it("maps each scheme's tokens onto the MUI palette, CTA as primary and accent as secondary", () => {
    const darkPalette = theme.colorSchemes.dark?.palette;
    const lightPalette = theme.colorSchemes.light?.palette;
    expect(darkPalette?.primary.main).toBe(LITE_SCHEMES.dark.cta);
    expect(darkPalette?.secondary.main).toBe(LITE_SCHEMES.dark.accent);
    expect(darkPalette?.background.default).toBe(LITE_SCHEMES.dark.page);
    expect(darkPalette?.text.primary).toBe(LITE_SCHEMES.dark.ink);
    expect(darkPalette?.lite).toEqual(LITE_SCHEMES.dark);
    expect(lightPalette?.primary.main).toBe(LITE_SCHEMES.light.cta);
    expect(lightPalette?.background.paper).toBe(LITE_SCHEMES.light.surface);
    expect(lightPalette?.error.main).toBe(LITE_SCHEMES.light.error);
  });

  it('uses the control radius and never upper-cases button text', () => {
    expect(theme.shape.borderRadius).toBe(LITE_RADII.control);
    expect(theme.typography.button.textTransform).toBe('none');
  });

  it('rides the colour scheme on a data attribute set before first paint', () => {
    expect(COLOR_SCHEME_ATTRIBUTE).toBe('data-lite-mode');
    expect(COLOR_SCHEME_SELECTOR).toBe('[data-lite-mode="%s"]');
    expect(MODE_STORAGE_KEY).toBe('lite_display_mode');
  });

  it('switches Light / Dark on the document without re-rendering a different tree', () => {
    function Switch() {
      const { setMode } = useColorScheme();
      return <Button onClick={() => setMode('light')}>Light</Button>;
    }
    render(
      <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="theme-test-mode">
        <Switch />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute(COLOR_SCHEME_ATTRIBUTE, 'light');
    localStorage.removeItem('theme-test-mode');
  });
});

describe('tint', () => {
  it('turns a token colour translucent', () => {
    expect(tint('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('tokens', () => {
  it('composes every scheme colour from the Duncit palette', () => {
    expect(LITE_SCHEMES.dark.page).toBe(dark.bg);
    expect(LITE_SCHEMES.dark.accent).toBe(brand[500]);
    expect(LITE_SCHEMES.light.page).toBe(light.bg);
    expect(LITE_SCHEMES.light.accent).toBe(light.primary);
  });

  it('rotates badge tints, wrapping both ways so a negative position still gets a colour', () => {
    expect(tintAt(0)).toBe(brand[500]);
    expect(tintAt(6)).toBe(tintAt(0));
    expect(tintAt(7)).toBe(tintAt(1));
    expect(tintAt(-1)).toBe(tintAt(5));
    expect(tintAt(-6)).toBe(tintAt(0));
  });
});

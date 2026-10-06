import { describe, expect, it } from 'vitest';
import { designVariables, fontCss, fontStack, googleFontsHref, tokensCss, type CmsDesignFont } from '../src/cms-design';

const font = (over: Partial<CmsDesignFont> = {}): CmsDesignFont => ({
  family: 'Inter',
  source: 'GOOGLE',
  weights: [400],
  italic: false,
  role: 'BODY',
  variable: '',
  fallback: 'sans-serif',
  files: [],
  ...over,
});

describe('tokensCss', () => {
  it('writes every token as a custom property on :root', () => {
    expect(tokensCss([{ name: '--color-primary', value: '#f82c2e' }, { name: '--radius', value: '4px' }])).toBe(
      ':root{--color-primary:#f82c2e;--radius:4px;}',
    );
  });

  it('writes nothing for a site without tokens', () => {
    expect(tokensCss([])).toBe('');
  });
});

describe('googleFontsHref', () => {
  it('asks for only the chosen, de-duplicated weights in order', () => {
    expect(googleFontsHref([font({ family: 'Plus Jakarta Sans', weights: [700, 400, 700] })])).toBe(
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap',
    );
  });

  it('adds the italic axis when the family is italic', () => {
    expect(googleFontsHref([font({ weights: [400, 700], italic: true })])).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    );
  });

  it('is null when no Google family has a weight', () => {
    expect(googleFontsHref([font({ weights: [] }), font({ source: 'CUSTOM' })])).toBeNull();
  });
});

describe('fontStack', () => {
  it('quotes the family before its fallback, defaulting to sans-serif', () => {
    expect(fontStack({ family: 'Baloo 2', fallback: 'cursive' })).toBe('"Baloo 2", cursive');
    expect(fontStack({ family: 'Inter', fallback: '' })).toBe('"Inter", sans-serif');
  });
});

describe('fontCss', () => {
  it('declares a face per uploaded file, in the format its extension names', () => {
    const css = fontCss([
      font({
        family: 'Brand',
        source: 'CUSTOM',
        role: 'NONE',
        files: [
          { weight: 400, style: 'normal', url: 'https://cdn.example/brand.ttf?v=2' },
          { weight: 700, style: 'italic', url: 'https://cdn.example/brand.OTF' },
          { weight: 500, style: 'normal', url: 'https://cdn.example/brand.woff' },
          { weight: 600, style: 'normal', url: 'https://cdn.example/brand.eot' },
        ],
      }),
    ]);
    expect(css).toContain('src:url("https://cdn.example/brand.ttf?v=2") format("truetype");font-weight:400;font-style:normal;font-display:swap}');
    expect(css).toContain('format("opentype");font-weight:700;font-style:italic');
    expect(css).toContain('brand.woff") format("woff")');
    // An unknown extension is served as woff2, the format every browser reads.
    expect(css).toContain('brand.eot") format("woff2")');
    expect(css).not.toContain(':root');
  });

  it('binds role and token variables to the family', () => {
    expect(fontCss([font({ role: 'HEADING', variable: '--font-display' })])).toBe(':root{--font-heading:"Inter", sans-serif;--font-display:"Inter", sans-serif;}');
  });

  it('writes nothing for no fonts', () => {
    expect(fontCss([])).toBe('');
  });
});

describe('designVariables', () => {
  it('lists the tokens, then the font variables', () => {
    expect(designVariables([{ name: '--color-primary', value: '#f82c2e' }], [font({ role: 'BODY' })])).toEqual([
      { name: '--color-primary', value: '#f82c2e' },
      { name: '--font-body', value: '"Inter", sans-serif' },
    ]);
  });

  it('lets a font variable win over a token of the same name, as in the stylesheet', () => {
    const variables = designVariables([{ name: '--font-body', value: 'serif' }], [font({ family: 'Lora', fallback: 'serif' })]);
    expect(variables).toEqual([{ name: '--font-body', value: '"Lora", serif' }]);
  });

  it('skips a font with no role and no variable', () => {
    expect(designVariables([], [font({ role: 'NONE', variable: '' })])).toEqual([]);
  });
});

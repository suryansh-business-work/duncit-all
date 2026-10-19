import { describe, expect, it } from 'vitest';
import { designSchema, toDesignFormValues, toDesignInput, type DesignFormValues } from '../../src/pages/cms/design-tab/design-form/design.types';
import { customFontSchema, toCustomFont } from '../../src/pages/cms/design-tab/fonts/custom-font-form/custom-font.types';
import { defaultWeights, googleFontSchema, toGoogleFont } from '../../src/pages/cms/design-tab/fonts/google-font-form/google-font.types';
import { codeSchema, toCodeFormValues, toCodeInput } from '../../src/pages/cms/code-tab/code-form/code.types';
import { makeSiteDesign } from '../mocks/cms.mock';

const t = (key: string) => key;

const font = (over: Partial<DesignFormValues['fonts'][number]> = {}): DesignFormValues['fonts'][number] => ({
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

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}: ${issue.message}`);

describe('design form — font token binding', () => {
  const values = (variable: string): DesignFormValues => ({ tokens: [], fonts: [font({ variable })], font_urls: [], base_css: '' });

  it('accepts no extra token, or a CSS variable, lower-casing what was typed', () => {
    expect(designSchema(t).parse(values('')).fonts[0].variable).toBe('');
    expect(designSchema(t).parse(values('  --Font-Display ')).fonts[0].variable).toBe('--font-display');
  });

  it('refuses a binding that is not a CSS variable', () => {
    expect(messages(designSchema(t).safeParse(values('font-display')))).toEqual(['fonts.0.variable: websiteApp.cms.fonts.errVariable']);
  });

  it('refuses a fallback that would break out of the font rule', () => {
    const result = designSchema(t).safeParse({ ...values(''), fonts: [font({ fallback: 'serif; } body {' })] });
    expect(messages(result)).toEqual(['fonts.0.fallback: websiteApp.cms.fonts.errFallback']);
  });
});

describe('design form — what is sent to the server', () => {
  it('files an ungrouped token under colour and drops blank stylesheet rows', () => {
    const parsed = designSchema(t).parse({
      tokens: [
        { name: '--brand', value: '#ff6600', group: '' },
        { name: '--space-1', value: '4px', group: 'spacing' },
      ],
      fonts: [font()],
      font_urls: [{ url: '' }, { url: 'https://fonts.googleapis.com/css2?family=Inter' }, { url: '  ' }],
      base_css: 'body{}',
    });
    expect(toDesignInput(parsed)).toEqual({
      tokens: [
        { name: '--brand', value: '#ff6600', group: 'color' },
        { name: '--space-1', value: '4px', group: 'spacing' },
      ],
      fonts: [font()],
      font_urls: ['https://fonts.googleapis.com/css2?family=Inter'],
      base_css: 'body{}',
    });
  });

  it('round-trips a saved design unchanged', () => {
    const design = makeSiteDesign().design;
    const input = toDesignInput(designSchema(t).parse(toDesignFormValues(design)));
    expect(input.tokens).toEqual([{ name: '--brand', value: '#ff6600', group: 'color' }]);
    expect(input.fonts).toEqual([expect.objectContaining({ family: 'Inter', role: 'HEADING', weights: [400] })]);
    expect(input.font_urls).toEqual([]);
  });
});

describe('uploaded font', () => {
  const files = [
    { weight: 700, style: 'italic' as const, url: 'https://ik.test/b-i.woff2' },
    { weight: 400, style: 'normal' as const, url: 'https://ik.test/r.woff2' },
    { weight: 700, style: 'normal' as const, url: 'https://ik.test/b.woff2' },
  ];

  it('lists each weight once in order, notes italics, and falls back to sans-serif when none is given', () => {
    const parsed = customFontSchema(t).parse({ family: ' Brand Sans ', role: 'BODY', fallback: '', files });
    expect(toCustomFont(parsed)).toEqual({
      family: 'Brand Sans',
      source: 'CUSTOM',
      weights: [400, 700],
      italic: true,
      role: 'BODY',
      variable: '',
      fallback: 'sans-serif',
      files,
    });
  });

  it('keeps a fallback the editor chose and reports no italics without an italic file', () => {
    const parsed = customFontSchema(t).parse({ family: 'Brand', role: 'HEADING', fallback: 'Georgia, serif', files: [files[1]] });
    expect(toCustomFont(parsed)).toMatchObject({ fallback: 'Georgia, serif', italic: false, weights: [400] });
  });
});

describe('Google font', () => {
  it('pre-picks regular and bold, else the first weight the family has', () => {
    expect(defaultWeights([100, 400, 700, 900])).toEqual([400, 700]);
    expect(defaultWeights([300, 500])).toEqual([300]);
    expect(defaultWeights([])).toEqual([]);
  });

  it('falls back by category, sans-serif for one it does not know', () => {
    const values = googleFontSchema(t).parse({ weights: [700, 400], italic: false, role: 'ACCENT' });
    expect(toGoogleFont('Caveat', 'handwriting', values)).toMatchObject({ fallback: 'cursive', weights: [400, 700], source: 'GOOGLE', files: [] });
    expect(toGoogleFont('Fira Code', 'monospace', values).fallback).toBe('monospace');
    expect(toGoogleFont('Odd', 'brand-new-category', values).fallback).toBe('sans-serif');
  });

  it('refuses a family with no weight', () => {
    expect(messages(googleFontSchema(t).safeParse({ weights: [], italic: false, role: 'BODY' }))).toEqual(['weights: websiteApp.cms.fonts.errWeights']);
  });
});

describe('site code', () => {
  it('sends every code field exactly as typed', () => {
    const values = codeSchema().parse({ head_html: '<meta name="x">', body_end_html: '<script></script>', custom_css: '.a{}', custom_js: 'go()' });
    expect(toCodeInput(values)).toEqual({ head_html: '<meta name="x">', body_end_html: '<script></script>', custom_css: '.a{}', custom_js: 'go()' });
  });

  it('starts blank before the site loads', () => {
    expect(toCodeInput(codeSchema().parse(toCodeFormValues(null)))).toEqual({ head_html: '', body_end_html: '', custom_css: '', custom_js: '' });
  });

  it('refuses head code over the size limit', () => {
    expect(codeSchema().safeParse({ head_html: 'x'.repeat(200_001), body_end_html: '', custom_css: '', custom_js: '' }).success).toBe(false);
  });
});

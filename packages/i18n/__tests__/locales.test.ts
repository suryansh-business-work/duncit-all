import { describe, expect, it } from 'vitest';
import {
  COMMON_REGION_LOCALES,
  ISO_639_1_LANGUAGES,
  describeLocale,
  isRtlLocale,
  localeOptions,
} from '../src/locales';

describe('ISO language catalogue', () => {
  it('ships the whole two-letter ISO 639-1 set, once each and in order', () => {
    expect(ISO_639_1_LANGUAGES).toHaveLength(184);
    expect(new Set(ISO_639_1_LANGUAGES).size).toBe(ISO_639_1_LANGUAGES.length);
    expect(ISO_639_1_LANGUAGES.every((code) => /^[a-z]{2}$/.test(code))).toBe(true);
    expect([...ISO_639_1_LANGUAGES]).toEqual([...ISO_639_1_LANGUAGES].sort((a, b) => a.localeCompare(b)));
  });

  it("covers every Indian scheduled language that has a two-letter code", () => {
    // The languages the product is actually asked for, each as its -IN tag.
    for (const code of ['hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN', 'ur-IN']) {
      expect(COMMON_REGION_LOCALES).toContain(code);
    }
  });

  // localeOptions concatenates the two lists and does NOT de-duplicate them,
  // because they cannot overlap. This is where that is checked.
  it('keeps the two lists disjoint, which is what lets the picker skip a de-dupe', () => {
    const languages = new Set(ISO_639_1_LANGUAGES);
    for (const tag of COMMON_REGION_LOCALES) {
      expect(tag).toContain('-');
      expect(languages.has(tag)).toBe(false);
    }
    expect(new Set(COMMON_REGION_LOCALES).size).toBe(COMMON_REGION_LOCALES.length);
  });

  it('offers only region tags that name a language the ISO list carries', () => {
    for (const tag of COMMON_REGION_LOCALES) {
      const language = tag.split('-')[0];
      // `fil` is ISO 639-2 only; every other shortlisted tag is a 639-1 language.
      if (language === 'fil') continue;
      expect(ISO_639_1_LANGUAGES).toContain(language);
    }
  });
});

describe('describeLocale', () => {
  it('names a language in its own script and in English, with its direction', () => {
    expect(describeLocale('hi-IN')).toEqual({
      code: 'hi-IN',
      label: 'हिन्दी (भारत)',
      english_label: 'Hindi (India)',
      is_rtl: false,
    });
  });

  it('marks a right-to-left language', () => {
    expect(describeLocale('ar-AE')).toMatchObject({
      english_label: 'Arabic (United Arab Emirates)',
      is_rtl: true,
    });
  });

  it('trims what it is handed', () => {
    expect(describeLocale('  ta-IN  ').code).toBe('ta-IN');
  });

  // The picker accepts typed input, so a half-typed tag reaches this every
  // keystroke — it has to describe itself rather than throw.
  it('describes an unparseable tag by itself instead of throwing', () => {
    expect(describeLocale('not a tag')).toEqual({
      code: 'not a tag',
      label: 'not a tag',
      english_label: 'not a tag',
      is_rtl: false,
    });
    expect(describeLocale('')).toEqual({ code: '', label: '', english_label: '', is_rtl: false });
  });

  it('answers for a language ICU has no name for, using the code itself', () => {
    // A well-formed tag with no CLDR entry: parseable, but unnameable.
    expect(describeLocale('qaa')).toMatchObject({ code: 'qaa', is_rtl: false });
  });
});

describe('isRtlLocale', () => {
  it.each(['ar', 'he', 'fa', 'ur', 'ps', 'dv', 'ckb', 'yi', 'ur-IN', 'ar-EG'])(
    'reads %s as right-to-left',
    (code) => {
      expect(isRtlLocale(code)).toBe(true);
    },
  );

  it.each(['en', 'hi', 'ta', 'zh-CN', 'ru', 'ja-JP'])('reads %s as left-to-right', (code) => {
    expect(isRtlLocale(code)).toBe(false);
  });

  // Direction follows the SCRIPT, not the language: Kurdish is written both
  // ways, and a per-language list would have to pick one and be wrong.
  it('separates the two scripts of one language', () => {
    expect(isRtlLocale('ku')).toBe(false);
    expect(isRtlLocale('ku-Arab')).toBe(true);
  });

  it('answers false for a tag it cannot read, rather than throwing', () => {
    expect(isRtlLocale('not a tag')).toBe(false);
    expect(isRtlLocale('')).toBe(false);
  });
});

describe('localeOptions', () => {
  const options = localeOptions();

  it('describes every shipped code exactly once', () => {
    const codes = options.map((option) => option.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain('en-IN');
    expect(codes).toContain('zu');
  });

  it('sorts by English name so the list reads alphabetically', () => {
    const names = options.map((option) => option.english_label);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('gives every row a tag, both names and a direction', () => {
    for (const option of options) {
      expect(option.code).not.toBe('');
      expect(option.label).not.toBe('');
      expect(option.english_label).not.toBe('');
      expect(typeof option.is_rtl).toBe('boolean');
    }
  });

  it('carries the region tags as well as the bare languages', () => {
    const codes = new Set(options.map((option) => option.code));
    for (const code of COMMON_REGION_LOCALES) expect(codes.has(code)).toBe(true);
    for (const code of ISO_639_1_LANGUAGES) expect(codes.has(code)).toBe(true);
  });
});

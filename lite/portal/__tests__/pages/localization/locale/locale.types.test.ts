import { describe, expect, it } from 'vitest';
import { emptyLocaleValues, localeValuesFrom, makeLocaleSchema, toLocaleInput, type LocaleFormValues } from '../../../../pages/localization/locale';
import { makeLocale } from '../../../fixtures';
import { portalT } from '../../../test-utils';

const schema = makeLocaleSchema(portalT);
const VALID: LocaleFormValues = localeValuesFrom(makeLocale({ code: 'hi', label: 'हिन्दी', english_label: 'Hindi', is_default: false, sort_order: 2 }));

const messageFor = <K extends keyof LocaleFormValues>(field: K, value: LocaleFormValues[K]): string | undefined =>
  schema.safeParse({ ...VALID, [field]: value }).error?.issues.find((issue) => issue.path[0] === field)?.message;

describe('locale form values', () => {
  it('starts a new language active, left-to-right, not default, sort order 0', () => {
    expect(emptyLocaleValues()).toEqual({ code: '', label: '', english_label: '', is_rtl: false, is_default: false, sort_order: '0', is_active: true });
  });

  it('reads a stored locale and writes it back unchanged', () => {
    expect(VALID).toEqual({ code: 'hi', label: 'हिन्दी', english_label: 'Hindi', is_rtl: false, is_default: false, sort_order: '2', is_active: true });
    expect(toLocaleInput(VALID)).toEqual({ code: 'hi', label: 'हिन्दी', english_label: 'Hindi', is_rtl: false, is_default: false, sort_order: 2, is_active: true });
  });

  it('sends a blank sort order as 0', () => {
    expect(toLocaleInput({ ...VALID, sort_order: '' }).sort_order).toBe(0);
  });
});

describe('makeLocaleSchema', () => {
  it('accepts BCP-47 tags: a language, then optional subtags', () => {
    for (const code of ['hi', 'en-IN', 'fil', 'zh-Hant-TW', 'es-419']) expect(messageFor('code', code), code).toBeUndefined();
  });

  it('asks for the code when it is blank', () => {
    expect(messageFor('code', '')).toBe('Language code is required');
  });

  it('refuses anything that is not a language tag', () => {
    for (const code of ['EN', 'english', 'e', 'en_IN', 'en-', 'en-I']) {
      expect(messageFor('code', code), code).toBe('Use a language tag such as en-IN or hi');
    }
  });

  it('requires both names, each at most 60 characters', () => {
    expect(messageFor('label', '')).toBe('Native name is required');
    expect(messageFor('label', 'x'.repeat(61))).toBe('Native name must be 60 characters or fewer');
    expect(messageFor('english_label', ' ')).toBe('English name is required');
    expect(messageFor('english_label', 'x'.repeat(61))).toBe('English name must be 60 characters or fewer');
  });

  it('bounds the sort order to 0..9999, blank allowed', () => {
    expect(messageFor('sort_order', '')).toBeUndefined();
    expect(messageFor('sort_order', '10000')).toBe('Sort order must be 9999 or less');
    expect(messageFor('sort_order', '1.5')).toBe('Sort order must be a whole number');
  });
});

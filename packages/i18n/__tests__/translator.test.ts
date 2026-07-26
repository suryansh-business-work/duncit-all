import { describe, expect, it, vi } from 'vitest';
import { createTranslator, interpolate, resolveLocale } from '../src/translator';
import type { Locale } from '../src/catalogue';

describe('interpolate', () => {
  it('substitutes {placeholders}', () => {
    expect(interpolate('Hi {name}, you have {n} pods', { name: 'Sam', n: 3 })).toBe(
      'Hi Sam, you have 3 pods',
    );
  });

  it('leaves an unmatched placeholder verbatim rather than printing undefined', () => {
    expect(interpolate('Hi {name}', {})).toBe('Hi {name}');
    expect(interpolate('Hi {name}', { other: 'x' })).toBe('Hi {name}');
    expect(interpolate('Hi {name}')).toBe('Hi {name}');
  });
});

describe('createTranslator', () => {
  const base = {
    locale: 'hi-IN',
    fallback: { 'common.save': 'Save', 'shop.title': 'Pod Shop' },
    server: { 'shop.title': 'पॉड शॉप' },
  };

  it('prefers server text, then the local fallback', () => {
    const { t } = createTranslator(base);
    expect(t('shop.title')).toBe('पॉड शॉप');
    // Untranslated on the server, but the bundle still renders real text.
    expect(t('common.save')).toBe('Save');
  });

  it('falls back to the default locale catalogue, then defaultValue, then the key', () => {
    const { t } = createTranslator({
      locale: 'hi-IN',
      defaultCatalogue: { 'only.in.default': 'From default' },
    });
    expect(t('only.in.default')).toBe('From default');
    expect(t('nowhere', { defaultValue: 'Literal' })).toBe('Literal');
    // Never blank: an unknown key renders itself so it is visible and greppable.
    expect(t('totally.unknown')).toBe('totally.unknown');
  });

  it('reports every missing key exactly once per call', () => {
    const onMissing = vi.fn();
    const { t } = createTranslator({ locale: 'hi-IN', onMissing });
    t('a.missing.key');
    expect(onMissing).toHaveBeenCalledWith('a.missing.key', 'hi-IN');
  });

  it('selects .one / .other from a count', () => {
    const { t } = createTranslator({
      locale: 'en-IN',
      fallback: { 'cart.items.one': '{count} item', 'cart.items.other': '{count} items' },
    });
    expect(t('cart.items', { count: 1 })).toBe('1 item');
    expect(t('cart.items', { count: 5 })).toBe('5 items');
    expect(t('cart.items', { count: -1 })).toBe('-1 item');
  });

  it('uses the plain key when a counted key has no plural siblings', () => {
    const { t } = createTranslator({ locale: 'en-IN', fallback: { 'x.y': 'Plain {count}' } });
    expect(t('x.y', { count: 2 })).toBe('Plain 2');
  });

  it('interpolates vars into a defaultValue too', () => {
    const { t } = createTranslator({ locale: 'en-IN' });
    expect(t('nope', { defaultValue: 'Hello {name}', vars: { name: 'Sam' } })).toBe('Hello Sam');
  });

  it('exposes has() and the merged catalogue', () => {
    const tr = createTranslator(base);
    expect(tr.has('shop.title')).toBe(true);
    expect(tr.has('nope')).toBe(false);
    expect(tr.catalogue['shop.title']).toBe('पॉड शॉप');
    expect(tr.locale).toBe('hi-IN');
    expect(tr.isRtl).toBe(false);
    expect(createTranslator({ locale: 'ar-AE', isRtl: true }).isRtl).toBe(true);
  });
});

describe('resolveLocale', () => {
  const locales: Locale[] = [
    { code: 'en-IN', label: 'English', is_default: true },
    { code: 'hi-IN', label: 'हिन्दी' },
    { code: 'ar-AE', label: 'العربية', is_rtl: true },
    { code: 'fr-FR', label: 'Français', is_active: false },
  ];

  it('matches the exact code, case-insensitively', () => {
    expect(resolveLocale('hi-IN', locales)?.code).toBe('hi-IN');
    expect(resolveLocale('HI-in', locales)?.code).toBe('hi-IN');
  });

  it('falls back to the same language when the region is unavailable', () => {
    expect(resolveLocale('hi', locales)?.code).toBe('hi-IN');
    expect(resolveLocale('ar-SA', locales)?.code).toBe('ar-AE');
  });

  it('never returns a deactivated locale', () => {
    expect(resolveLocale('fr-FR', locales)?.code).toBe('en-IN');
  });

  it('falls back to the default, then the first active locale', () => {
    expect(resolveLocale('zz-ZZ', locales)?.code).toBe('en-IN');
    expect(resolveLocale(null, locales)?.code).toBe('en-IN');
    const noDefault = [{ code: 'hi-IN', label: 'हिन्दी' }];
    expect(resolveLocale('zz', noDefault)?.code).toBe('hi-IN');
  });

  it('returns null when nothing is active', () => {
    expect(resolveLocale('en-IN', [])).toBeNull();
    expect(resolveLocale('en-IN', null)).toBeNull();
    expect(resolveLocale('en-IN', [{ code: 'x', label: 'X', is_active: false }])).toBeNull();
  });
});

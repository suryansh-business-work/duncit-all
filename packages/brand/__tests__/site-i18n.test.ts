import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSiteLocales,
  getSiteTranslator,
  siteT,
  WEBSITE_FALLBACK,
  WEBSITE_FALLBACK_FLAT,
} from '../src/site-i18n';

afterEach(() => vi.unstubAllGlobals());

const answer = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body });

const locale = { code: 'hi-IN', label: 'Hindi', english_label: 'Hindi', is_rtl: false, is_default: false };

describe('fallback catalogue', () => {
  it('merges the website, grievance and privacy namespaces', () => {
    const roots = Object.keys(WEBSITE_FALLBACK);
    expect(roots).toEqual(expect.arrayContaining(['website', 'grievance', 'privacy']));
  });

  it('flattens to dotted keys the consent banner reads', () => {
    expect(WEBSITE_FALLBACK_FLAT['privacy.banner.title']).toEqual(expect.any(String));
  });

  it('answers siteT from the bundle, and with the key itself when unknown', () => {
    expect(siteT('privacy.banner.title')).toBe(WEBSITE_FALLBACK_FLAT['privacy.banner.title']);
    expect(siteT('no.such.key')).toBe('no.such.key');
  });
});

describe('fetchSiteLocales', () => {
  it('returns the active locales', async () => {
    const fetchMock = answer({ data: { publicLocales: [locale] } });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchSiteLocales('https://api.test/gql')).toEqual([locale]);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/gql');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).query).toContain('publicLocales');
  });

  it('returns an empty list for an HTTP error', async () => {
    vi.stubGlobal('fetch', answer({}, false));
    expect(await fetchSiteLocales('u')).toEqual([]);
  });

  it('returns an empty list for GraphQL errors', async () => {
    vi.stubGlobal('fetch', answer({ errors: [{ message: 'x' }], data: { publicLocales: [locale] } }));
    expect(await fetchSiteLocales('u')).toEqual([]);
  });

  it('returns an empty list when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await fetchSiteLocales('u')).toEqual([]);
  });

  it('returns an empty list when data is absent', async () => {
    vi.stubGlobal('fetch', answer({ data: null }));
    expect(await fetchSiteLocales('u')).toEqual([]);
  });
});

describe('getSiteTranslator', () => {
  it('prefers the server text, falling back to the bundle then the key', async () => {
    const fetchMock = answer({
      data: { publicTranslations: [{ key: 'privacy.banner.title', value: 'Gopniyata' }] },
    });
    vi.stubGlobal('fetch', fetchMock);
    const t = await getSiteTranslator('https://api.test/gql', 'hi-IN');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ locale: 'hi-IN' });
    expect(t.t('privacy.banner.title')).toBe('Gopniyata');
    expect(t.t('privacy.banner.acceptAll')).toBe(WEBSITE_FALLBACK_FLAT['privacy.banner.acceptAll']);
    expect(t.t('missing.key')).toBe('missing.key');
  });

  it('defaults to en-IN and ships the bundle when the API is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    vi.stubGlobal('fetch', fetchMock);
    const t = await getSiteTranslator('u');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ locale: 'en-IN' });
    expect(t.t('privacy.banner.title')).toBe(WEBSITE_FALLBACK_FLAT['privacy.banner.title']);
  });

  it('uses the bundle when the response has no translations', async () => {
    vi.stubGlobal('fetch', answer({ data: {} }));
    const t = await getSiteTranslator('u');
    expect(t.t('privacy.banner.title')).toBe(WEBSITE_FALLBACK_FLAT['privacy.banner.title']);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { urlConfigs } from '../config/url-configs';
import { fetchLocales, getTranslator, WEBSITE_FALLBACK, WEBSITE_FALLBACK_FLAT } from './i18n';

interface FakeResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

const ok = (data: unknown, errors?: unknown[]): FakeResponse => ({
  ok: true,
  json: async () => ({ data, errors }),
});

const fetchMock = vi.fn();

/** The request body of the nth fetch call, as the server would parse it. */
const sentBody = (call = 0): { query: string; variables?: Record<string, unknown> } =>
  JSON.parse(fetchMock.mock.calls[call][1].body);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the bundled fallback bundle', () => {
  it('flattens the shared website bundle to dot-path keys', () => {
    expect(WEBSITE_FALLBACK.website).toBeDefined();
    expect(WEBSITE_FALLBACK_FLAT['website.footer.notify']).toBe('Notify');
    expect(WEBSITE_FALLBACK_FLAT['website.nav.closeMenu']).toBe('Close menu');
  });
});

describe('fetchLocales', () => {
  it('returns the active locales from the API', async () => {
    const locale = {
      code: 'hi-IN',
      label: 'हिन्दी',
      english_label: 'Hindi',
      is_rtl: false,
      is_default: false,
    };
    fetchMock.mockResolvedValue(ok({ publicLocales: [locale] }));

    await expect(fetchLocales()).resolves.toEqual([locale]);
    expect(fetchMock.mock.calls[0][0]).toBe(urlConfigs.graphqlUrl);
    expect(sentBody().query).toContain('publicLocales');
    // The locales query is unparameterised, so nothing is sent alongside it.
    expect(sentBody().variables).toBeUndefined();
  });

  it('returns an empty list when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(fetchLocales()).resolves.toEqual([]);
  });

  it('returns an empty list when the network throws', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(fetchLocales()).resolves.toEqual([]);
  });

  it('returns an empty list when the response carries GraphQL errors', async () => {
    fetchMock.mockResolvedValue(ok({ publicLocales: [{ code: 'en-IN' }] }, [{ message: 'boom' }]));
    await expect(fetchLocales()).resolves.toEqual([]);
  });

  it('tolerates an empty errors array and a payload without the field', async () => {
    fetchMock.mockResolvedValue(ok({}, []));
    await expect(fetchLocales()).resolves.toEqual([]);
  });
});

describe('getTranslator', () => {
  it('lets server copy win over the bundled fallback for the requested locale', async () => {
    fetchMock.mockResolvedValue(
      ok({
        publicTranslations: [
          { key: 'website.footer.notify', value: 'Sūchit karein' },
          { key: 'website.footer.rights', value: 'Sarvadhikar surakshit' },
        ],
      }),
    );

    const t = await getTranslator('hi-IN');

    expect(t.locale).toBe('hi-IN');
    expect(t.t('website.footer.notify')).toBe('Sūchit karein');
    expect(t.t('website.footer.rights')).toBe('Sarvadhikar surakshit');
    // Untranslated keys still resolve, from the bundle baked into this build.
    expect(t.t('website.nav.closeMenu')).toBe('Close menu');
    expect(sentBody().variables).toEqual({ locale: 'hi-IN' });
  });

  it('defaults to en-IN when no locale is given', async () => {
    fetchMock.mockResolvedValue(ok({ publicTranslations: [] }));

    const t = await getTranslator();

    expect(t.locale).toBe('en-IN');
    expect(sentBody().variables).toEqual({ locale: 'en-IN' });
  });

  it('renders entirely from the local bundle when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const t = await getTranslator('en-IN');

    expect(t.t('website.footer.notify')).toBe('Notify');
    expect(t.t('website.footer.policyHub')).toBe('Policy Hub');
    expect(t.has('website.footer.subscribed')).toBe(true);
  });

  it('falls back to the local bundle when the server answers with errors', async () => {
    fetchMock.mockResolvedValue(
      ok({ publicTranslations: [{ key: 'website.footer.notify', value: 'Ignored' }] }, [
        { message: 'boom' },
      ]),
    );

    const t = await getTranslator('en-IN');

    expect(t.t('website.footer.notify')).toBe('Notify');
  });

  it('returns the key itself for a key that exists nowhere', async () => {
    fetchMock.mockResolvedValue(ok({ publicTranslations: [] }));

    const t = await getTranslator('en-IN');

    expect(t.has('website.footer.doesNotExist')).toBe(false);
    expect(t.t('website.footer.doesNotExist')).toBe('website.footer.doesNotExist');
  });
});

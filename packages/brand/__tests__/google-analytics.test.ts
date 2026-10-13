// @vitest-environment jsdom
import { makeConsent, writeWebConsent } from '@duncit/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGoogleAnalytics } from '../src/google-analytics';

const allowAnalytics = () => writeWebConsent(makeConsent({ analytics: true, marketing: false }));

let listenerSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  document.head.innerHTML = '';
  document.cookie = 'duncit_consent=; path=/; max-age=0';
  listenerSpy = vi.spyOn(globalThis, 'addEventListener');
});
afterEach(() => {
  // A pending "when consent allows" listener must not leak into the next test.
  for (const [type, listener] of listenerSpy.mock.calls) {
    globalThis.removeEventListener(type, listener as EventListener);
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const reply = (body: unknown, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => body });

const settle = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe('loadGoogleAnalytics', () => {
  it('asks nothing and installs nothing before the visitor allows analytics', async () => {
    const fetchMock = reply({ data: { googleAnalyticsTag: 'G-ABC123' } });
    vi.stubGlobal('fetch', fetchMock);
    loadGoogleAnalytics('https://api.test/gql', 'MAIN');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('installs gtag.js and the bootstrap with the id the server returns', async () => {
    allowAnalytics();
    const fetchMock = reply({ data: { googleAnalyticsTag: 'G-ABC123' } });
    vi.stubGlobal('fetch', fetchMock);
    loadGoogleAnalytics('https://api.test/gql', 'PARTNERS');
    await settle();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables).toEqual({ site: 'PARTNERS' });
    const scripts = document.head.querySelectorAll('script');
    expect(scripts).toHaveLength(2);
    expect(scripts[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-ABC123');
    expect(scripts[0].async).toBe(true);
    expect(scripts[1].textContent).toContain('gtag(\'config\', "G-ABC123");');
  });

  it('installs nothing when the website has no tag', async () => {
    allowAnalytics();
    vi.stubGlobal('fetch', reply({ data: { googleAnalyticsTag: null } }));
    loadGoogleAnalytics('u', 'ADS');
    await settle();
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('installs nothing when the body carries no data', async () => {
    allowAnalytics();
    vi.stubGlobal('fetch', reply({}));
    loadGoogleAnalytics('u', 'ADS');
    await settle();
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('logs a non-OK answer instead of throwing', async () => {
    allowAnalytics();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', reply({}, false, 503));
    loadGoogleAnalytics('u', 'EARNWITH');
    await settle();
    expect(warn).toHaveBeenCalledWith('Google Analytics did not load', expect.objectContaining({ message: expect.stringContaining('HTTP 503') }));
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('logs GraphQL errors', async () => {
    allowAnalytics();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', reply({ errors: [{ message: 'nope' }] }));
    loadGoogleAnalytics('u', 'STATUS');
    await settle();
    expect(warn.mock.calls[0][1]).toMatchObject({ message: expect.stringContaining('nope') });
  });

  it('logs a network failure', async () => {
    allowAnalytics();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    loadGoogleAnalytics('u', 'ECOMM');
    await settle();
    expect(warn).toHaveBeenCalledWith('Google Analytics did not load', expect.any(Error));
  });

  it('starts as soon as the visitor allows analytics later, without a reload', async () => {
    const fetchMock = reply({ data: { googleAnalyticsTag: 'G-LATE' } });
    vi.stubGlobal('fetch', fetchMock);
    loadGoogleAnalytics('u', 'MAIN');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    allowAnalytics();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_COOKIE, makeConsent, writeWebConsent } from '../src/consent';
import { SHORT_LINK_CLICK_KEY, SHORT_LINK_CONSENT_PARAM } from '../src/short-link-attribution';
import { startWebShortLinkAttribution } from '../src/web-attribution';

const SERVER = 'https://server.duncit.com';

const stubFetch = (clickId: string | null) => {
  const fetchFn = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ click_id: clickId }) });
  vi.stubGlobal('fetch', fetchFn);
  return fetchFn;
};

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
  globalThis.history.replaceState(null, '', '/');
});

describe('startWebShortLinkAttribution', () => {
  it('reports anonymously and keeps the click only once marketing is allowed', async () => {
    globalThis.history.replaceState(null, '', '/?dlc=c-1');
    const fetchFn = stubFetch('c-1');

    expect(await startWebShortLinkAttribution(SERVER)).toBe('c-1');
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.has(SHORT_LINK_CONSENT_PARAM)).toBe(false);
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBeNull();

    writeWebConsent(makeConsent({ analytics: false, marketing: true }));
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBe('c-1');
  });

  it('reports with consent and keeps the click at once when it was already given', async () => {
    writeWebConsent(makeConsent({ analytics: false, marketing: true }));
    globalThis.history.replaceState(null, '', '/?dlc=c-2');
    const fetchFn = stubFetch('c-2');

    await startWebShortLinkAttribution(SERVER);
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get(SHORT_LINK_CONSENT_PARAM)).toBe('1');
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBe('c-2');
  });
});

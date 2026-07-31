import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SHORT_LINK_CLICK_KEY,
  captureShortLinkAttribution,
  parseShortLinkParams,
  storedShortLinkClickId,
} from '../src/short-link-attribution';

const SERVER = 'https://server.duncit.com';

const okFetch = (clickId: string | null = 'c-new') =>
  vi.fn().mockResolvedValue({ json: () => Promise.resolve({ click_id: clickId }) });

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('parseShortLinkParams', () => {
  it('reads both markers a short link appends', () => {
    expect(parseShortLinkParams('?utm_source=instagram&dl=aB3xY9Zq&dlc=c-1')).toEqual({
      code: 'aB3xY9Zq',
      clickId: 'c-1',
    });
  });

  it('is empty for ordinary traffic', () => {
    expect(parseShortLinkParams('')).toEqual({ code: null, clickId: null });
    expect(parseShortLinkParams('?utm_source=instagram')).toEqual({ code: null, clickId: null });
  });
});

describe('storedShortLinkClickId', () => {
  it('reads the remembered click', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    expect(storedShortLinkClickId()).toBe('c-1');
  });

  it('is null with nothing stored, and when storage is unavailable', () => {
    expect(storedShortLinkClickId()).toBeNull();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(storedShortLinkClickId()).toBeNull();
    getItem.mockRestore();
  });
});

describe('captureShortLinkAttribution', () => {
  it('reports a dlc landing and remembers the click', async () => {
    const fetchFn = okFetch('c-1');
    const id = await captureShortLinkAttribution({
      search: '?dl=aB3xY9Zq&dlc=c-1',
      referrer: 'https://l.instagram.com/',
      serverUrl: SERVER,
      fetchFn,
    });
    expect(id).toBe('c-1');
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBe('c-1');
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(`${SERVER}/r/v`);
    // dlc is the stronger marker — the code is not sent alongside it.
    expect(url.searchParams.get('dlc')).toBe('c-1');
    expect(url.searchParams.get('dl')).toBeNull();
    expect(url.searchParams.get('dr')).toBe('https://l.instagram.com/');
  });

  // The whole point of the dl fallback: a shared tagged URL that never went
  // through the redirect still identifies the link, and the server mints the
  // click.
  it('resolves a code-only visit through the server', async () => {
    const fetchFn = okFetch('c-minted');
    const id = await captureShortLinkAttribution({
      search: '?utm_source=instagram&dl=aB3xY9Zq',
      referrer: '',
      serverUrl: `${SERVER}/`,
      fetchFn,
    });
    expect(id).toBe('c-minted');
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBe('c-minted');
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe('/r/v');
    expect(url.searchParams.get('dl')).toBe('aB3xY9Zq');
    expect(url.searchParams.has('dr')).toBe(false);
  });

  it('does nothing at all for ordinary traffic', async () => {
    const fetchFn = okFetch();
    expect(
      await captureShortLinkAttribution({ search: '', referrer: '', serverUrl: SERVER, fetchFn }),
    ).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // Otherwise the last link before checkout takes credit for the first one's
  // work — but the second link's own landing must still be reported.
  it('keeps the first attribution while still reporting the new landing', async () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-first');
    const fetchFn = okFetch('c-second');
    const id = await captureShortLinkAttribution({
      search: '?dlc=c-second',
      referrer: '',
      serverUrl: SERVER,
      fetchFn,
    });
    expect(id).toBe('c-first');
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBe('c-first');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('stores nothing when the server does not recognise the marker', async () => {
    const id = await captureShortLinkAttribution({
      search: '?dl=aB3xY9Zq',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch(null),
    });
    expect(id).toBeNull();
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBeNull();
  });

  it('survives the API being unreachable', async () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-kept');
    const id = await captureShortLinkAttribution({
      search: '?dlc=c-2',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: vi.fn().mockRejectedValue(new Error('offline')),
    });
    expect(id).toBe('c-kept');
  });

  it('survives an opaque response that cannot be parsed', async () => {
    const id = await captureShortLinkAttribution({
      search: '?dlc=c-2',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: vi.fn().mockResolvedValue({ json: () => Promise.reject(new Error('opaque')) }),
    });
    expect(id).toBeNull();
  });

  it('survives storage refusing the write', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const id = await captureShortLinkAttribution({
      search: '?dlc=c-1',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch('c-1'),
    });
    expect(id).toBe('c-1');
    setItem.mockRestore();
  });

  it('does nothing when no fetch exists at all', async () => {
    vi.stubGlobal('fetch', undefined);
    expect(
      await captureShortLinkAttribution({ search: '?dlc=c-1', referrer: '', serverUrl: SERVER }),
    ).toBeNull();
  });

  it('answers a malformed body as no attribution', async () => {
    const id = await captureShortLinkAttribution({
      search: '?dl=aB3xY9Zq',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: vi.fn().mockResolvedValue({ json: () => Promise.resolve(null) }),
    });
    expect(id).toBeNull();
  });
});

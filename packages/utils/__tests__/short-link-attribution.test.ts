import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SHORT_LINK_CLICK_KEY,
  SHORT_LINK_SHARE_KEY,
  SHORT_LINK_UTM_KEY,
  captureShortLinkAttribution,
  installAttributionLinkDecorator,
  isAttributableLink,
  parseShortLinkParams,
  storedAttributionParams,
  storedMemberShare,
  storedShortLinkClickId,
  withAttribution,
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
      memberShare: false,
    });
  });

  it('marks the link a member minted by sharing, so a landing may relax the session guard', () => {
    expect(parseShortLinkParams('?dl=aB3xY9Zq&dlc=c-1&dls=1')).toEqual({
      code: 'aB3xY9Zq',
      clickId: 'c-1',
      memberShare: true,
    });
  });

  it('reads any other dls value as the stricter marketing case', () => {
    expect(parseShortLinkParams('?dl=aB3xY9Zq&dls=0').memberShare).toBe(false);
  });

  it('is empty for ordinary traffic', () => {
    expect(parseShortLinkParams('')).toEqual({ code: null, clickId: null, memberShare: false });
    expect(parseShortLinkParams('?utm_source=instagram')).toEqual({
      code: null,
      clickId: null,
      memberShare: false,
    });
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

describe('utm persistence through capture', () => {
  it('remembers the landing utms even without any short-link marker', async () => {
    await captureShortLinkAttribution({
      search: '?utm_source=newsletter&utm_medium=email&utm_campaign=aug&x=1',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch(),
    });
    expect(JSON.parse(localStorage.getItem(SHORT_LINK_UTM_KEY) as string)).toEqual({
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'aug',
    });
  });

  // First touch, same rule as the click id.
  it('keeps the first campaign identity over a later one', async () => {
    localStorage.setItem(SHORT_LINK_UTM_KEY, JSON.stringify({ utm_source: 'first' }));
    await captureShortLinkAttribution({
      search: '?utm_source=second',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch(),
    });
    expect(JSON.parse(localStorage.getItem(SHORT_LINK_UTM_KEY) as string)).toEqual({
      utm_source: 'first',
    });
  });

  it('stores nothing for an untagged landing, and survives storage refusing', async () => {
    await captureShortLinkAttribution({
      search: '?ref=abc',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch(),
    });
    expect(localStorage.getItem(SHORT_LINK_UTM_KEY)).toBeNull();

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(
      captureShortLinkAttribution({
        search: '?utm_source=x&dlc=c-1',
        referrer: '',
        serverUrl: SERVER,
        fetchFn: okFetch('c-1'),
      }),
    ).resolves.toBe('c-1');
    getItem.mockRestore();
  });
});

describe('storedAttributionParams', () => {
  it('merges the stored utms with the click id', () => {
    localStorage.setItem(SHORT_LINK_UTM_KEY, JSON.stringify({ utm_source: 'instagram' }));
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    expect(storedAttributionParams()).toEqual({ utm_source: 'instagram', dlc: 'c-1' });
  });

  it('is empty with nothing stored, and shrugs off corrupt JSON', () => {
    expect(storedAttributionParams()).toEqual({});
    localStorage.setItem(SHORT_LINK_UTM_KEY, '{not json');
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    expect(storedAttributionParams()).toEqual({ dlc: 'c-1' });
  });
});

describe('isAttributableLink', () => {
  it('accepts our surfaces and the app scheme, nothing else', () => {
    expect(isAttributableLink('https://mweb.duncit.com/shop')).toBe(true);
    expect(isAttributableLink('https://duncit.com/about')).toBe(true);
    expect(isAttributableLink('duncit:/club/x/pod/y')).toBe(true);
    expect(isAttributableLink('https://notduncit.com/x')).toBe(false);
    expect(isAttributableLink('https://evil.example/duncit.com')).toBe(false);
    expect(isAttributableLink('mailto:support@duncit.com')).toBe(false);
    expect(isAttributableLink('not a url')).toBe(false);
  });
});

describe('withAttribution', () => {
  it('attaches the stored identity without overriding what the link says', () => {
    localStorage.setItem(
      SHORT_LINK_UTM_KEY,
      JSON.stringify({ utm_source: 'instagram', utm_medium: 'social' }),
    );
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    const url = new URL(withAttribution('https://mweb.duncit.com/shop?utm_source=own'));
    // The link named its own source — it meant it.
    expect(url.searchParams.get('utm_source')).toBe('own');
    expect(url.searchParams.get('utm_medium')).toBe('social');
    expect(url.searchParams.get('dlc')).toBe('c-1');
  });

  it('decorates the native app scheme too', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    expect(withAttribution('duncit:/club/x?a=1')).toContain('dlc=c-1');
  });

  it('returns the url untouched with nothing stored, or when unparseable', () => {
    expect(withAttribution('https://mweb.duncit.com/shop')).toBe('https://mweb.duncit.com/shop');
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    expect(withAttribution('::::')).toBe('::::');
  });
});

describe('installAttributionLinkDecorator', () => {
  const clickThrough = (element: Element) => {
    // Swallow the default so jsdom does not try to actually navigate.
    const swallow = (event: Event) => event.preventDefault();
    document.addEventListener('click', swallow);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    document.removeEventListener('click', swallow);
  };

  it('rewrites a duncit link at click time, exactly once', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    const uninstall = installAttributionLinkDecorator();
    const anchor = document.createElement('a');
    anchor.href = 'https://mweb.duncit.com/shop';
    document.body.append(anchor);

    clickThrough(anchor);
    expect(anchor.href).toContain('dlc=c-1');
    const once = anchor.href;
    clickThrough(anchor);
    expect(anchor.href).toBe(once);

    anchor.remove();
    uninstall();
  });

  it('reaches an anchor through the element the click actually hit', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    const uninstall = installAttributionLinkDecorator();
    const anchor = document.createElement('a');
    anchor.href = 'https://duncit.com/about';
    const inner = document.createElement('span');
    anchor.append(inner);
    document.body.append(anchor);

    clickThrough(inner);
    expect(anchor.href).toContain('dlc=c-1');
    anchor.remove();
    uninstall();
  });

  it('leaves fragments, foreign links and non-links alone', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    const uninstall = installAttributionLinkDecorator();

    const fragment = document.createElement('a');
    fragment.setAttribute('href', '#section');
    const foreign = document.createElement('a');
    foreign.href = 'https://example.com/x';
    const plain = document.createElement('button');
    document.body.append(fragment, foreign, plain);

    clickThrough(fragment);
    expect(fragment.getAttribute('href')).toBe('#section');
    clickThrough(foreign);
    expect(foreign.href).toBe('https://example.com/x');
    plain.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    fragment.remove();
    foreign.remove();
    plain.remove();
    uninstall();
  });

  it('does nothing for a visitor with no attribution, and uninstalls cleanly', () => {
    const uninstall = installAttributionLinkDecorator();
    const anchor = document.createElement('a');
    anchor.href = 'https://mweb.duncit.com/shop';
    document.body.append(anchor);

    clickThrough(anchor);
    expect(anchor.href).toBe('https://mweb.duncit.com/shop');

    uninstall();
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    clickThrough(anchor);
    // The listener is gone — nothing rewrites any more.
    expect(anchor.href).toBe('https://mweb.duncit.com/shop');
    anchor.remove();
  });

  it('covers middle-click opens too', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    const uninstall = installAttributionLinkDecorator();
    const anchor = document.createElement('a');
    anchor.href = 'https://partners.duncit.com/join';
    document.body.append(anchor);

    anchor.dispatchEvent(
      new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
    );
    expect(anchor.href).toContain('dlc=c-1');
    anchor.remove();
    uninstall();
  });
});

describe('storedMemberShare', () => {
  it('remembers that the click came from a member sharing something', () => {
    localStorage.setItem(SHORT_LINK_SHARE_KEY, '1');
    expect(storedMemberShare()).toBe(true);
  });

  it('reads anything else as the stricter marketing case', () => {
    expect(storedMemberShare()).toBe(false);
    localStorage.setItem(SHORT_LINK_SHARE_KEY, '0');
    expect(storedMemberShare()).toBe(false);
  });

  it('reads storage the browser refuses as the stricter marketing case too', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(storedMemberShare()).toBe(false);
    getItem.mockRestore();
  });
});

describe('member-share markers through a capture', () => {
  it('stores the share marker beside the click, so it survives the hops that follow', async () => {
    await captureShortLinkAttribution({
      search: '?dl=aB3xY9Zq&dlc=c-1&dls=1',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch('c-1'),
    });

    expect(storedMemberShare()).toBe(true);
    expect(storedShortLinkClickId()).toBe('c-1');
  });

  it('clears a stale share marker when the next landing is a marketing one', async () => {
    localStorage.setItem(SHORT_LINK_SHARE_KEY, '1');

    await captureShortLinkAttribution({
      search: '?dl=aB3xY9Zq&dlc=c-2',
      referrer: '',
      serverUrl: SERVER,
      fetchFn: okFetch('c-2'),
    });

    expect(storedMemberShare()).toBe(false);
  });

  it('carries the marker onto decorated links, so a hop cannot turn a friend’s link into a marketing landing', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    localStorage.setItem(SHORT_LINK_SHARE_KEY, '1');

    expect(storedAttributionParams()).toEqual({ dlc: 'c-1', dls: '1' });
  });

  it('leaves the marker off when the browser is attributed to no click at all', () => {
    localStorage.setItem(SHORT_LINK_SHARE_KEY, '1');

    expect(storedAttributionParams()).toEqual({});
  });
});

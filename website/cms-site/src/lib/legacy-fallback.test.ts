import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromLegacy, legacyOrigin } from './legacy-fallback';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('legacyOrigin', () => {
  it("reads the site's origin without a trailing slash", () => {
    vi.stubEnv('LEGACY_ORIGIN_MAIN', ' http://website:2000/ ');
    expect(legacyOrigin('MAIN')).toBe('http://website:2000');
    vi.stubEnv('LEGACY_ORIGIN_ADS', 'http://ads:2000');
    expect(legacyOrigin('ADS')).toBe('http://ads:2000');
  });

  it('is null for a site without a legacy site or an origin', () => {
    expect(legacyOrigin(null)).toBeNull();
    expect(legacyOrigin(undefined)).toBeNull();
    expect(legacyOrigin('')).toBeNull();
    vi.stubEnv('LEGACY_ORIGIN_PARTNERS', '  ');
    expect(legacyOrigin('PARTNERS')).toBeNull();
  });
});

describe('fromLegacy', () => {
  const visit = (init: RequestInit & { headers?: Record<string, string> } = {}) => new Request('https://duncit.com/aB3xY9Zq?utm=1', init);

  it('passes the old site a redirect back untouched, minus hop-by-hop headers', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/pods/1', connection: 'close', 'x-extra': 'y' } }));
    const answer = await fromLegacy('http://website:2000', visit({ headers: { accept: 'text/html', cookie: 'a=1' } }));
    expect(answer?.status).toBe(302);
    expect(answer?.headers.get('location')).toBe('/pods/1');
    expect(answer?.headers.get('x-extra')).toBe('y');
    expect(answer?.headers.get('connection')).toBeNull();
    expect(answer?.headers.get('x-served-by')).toBe('legacy');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://website:2000/aB3xY9Zq?utm=1');
    const sent = new Headers(init?.headers);
    expect(sent.get('accept')).toBe('text/html');
    expect(sent.get('cookie')).toBe('a=1');
    expect(sent.get('user-agent')).toBeNull();
    expect(sent.get('x-forwarded-host')).toBe('duncit.com');
    expect(sent.get('x-forwarded-proto')).toBe('https');
    expect(init?.redirect).toBe('manual');
  });

  it('keeps the proxy-reported protocol and sends a body for GET only', async () => {
    fetchMock.mockResolvedValueOnce(new Response('hello', { status: 200 }));
    const got = await fromLegacy('http://website:2000', visit({ headers: { 'x-forwarded-proto': 'http' } }));
    expect(await got?.text()).toBe('hello');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('x-forwarded-proto')).toBe('http');

    fetchMock.mockResolvedValueOnce(new Response('hello', { status: 200 }));
    const head = await fromLegacy('http://website:2000', visit({ method: 'HEAD' }));
    expect(head?.status).toBe(200);
    expect(await head?.text()).toBe('');
  });

  it('leaves the CMS 404 standing when the old site has nothing, is down, or the request is not a read', async () => {
    fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404 }));
    await expect(fromLegacy('http://website:2000', visit())).resolves.toBeNull();

    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(fromLegacy('http://website:2000', visit())).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce('boom');
    await expect(fromLegacy('http://website:2000', visit())).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith('[cms-site] legacy fallback failed', { origin: 'http://website:2000', path: '/aB3xY9Zq', reason: 'boom' });

    await expect(fromLegacy('http://website:2000', visit({ method: 'POST' }))).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

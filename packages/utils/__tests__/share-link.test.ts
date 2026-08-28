import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearShareLinkCache,
  trackedPodShareLinks,
  trackedShareUrl,
  type ShareLinkFetcher,
  type ShareUrlResolver,
} from '../src/share-link';

const PLAIN = 'https://duncit.com/pod/DUN-POD-4821';
const MAP = 'https://maps.google.com/?q=Indiranagar';
const SHORT = 'https://duncit.com/aB3xY9Zq';

beforeEach(() => {
  clearShareLinkCache();
});

describe('trackedShareUrl', () => {
  it('hands out the minted short link', async () => {
    const fetcher: ShareLinkFetcher = vi.fn().mockResolvedValue(SHORT);

    await expect(trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN)).resolves.toBe(SHORT);
    expect(fetcher).toHaveBeenCalledWith('POD', 'DUN-POD-4821');
  });

  it('asks once per thing shared — a share sheet must not wait on a round trip it already made', async () => {
    const fetcher: ShareLinkFetcher = vi.fn().mockResolvedValue(SHORT);

    const [first, second] = await Promise.all([
      trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN),
      trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN),
    ]);
    const third = await trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);

    expect([first, second, third]).toEqual([SHORT, SHORT, SHORT]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keys the cache on target and ref, so two things never share one answer', async () => {
    const fetcher: ShareLinkFetcher = vi
      .fn()
      .mockResolvedValueOnce('https://duncit.com/pod-code')
      .mockResolvedValueOnce('https://duncit.com/map-code');

    await expect(trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN)).resolves.toBe(
      'https://duncit.com/pod-code',
    );
    await expect(trackedShareUrl(fetcher, 'POD_LOCATION', 'DUN-POD-4821', MAP)).resolves.toBe(
      'https://duncit.com/map-code',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('falls back to the plain URL when the API refuses to mint one', async () => {
    const fetcher: ShareLinkFetcher = vi.fn().mockResolvedValue(null);

    await expect(trackedShareUrl(fetcher, 'PROFILE', 'user-1', PLAIN)).resolves.toBe(PLAIN);
  });

  it('falls back to the plain URL when the API cannot be reached — sharing is the user’s action, not the tracking’s', async () => {
    const fetcher: ShareLinkFetcher = vi.fn().mockRejectedValue(new Error('offline'));

    await expect(trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN)).resolves.toBe(PLAIN);
  });

  it('forgets a failed attempt, so the next share retries rather than reusing the miss', async () => {
    const fetcher: ShareLinkFetcher = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(SHORT);

    await expect(trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN)).resolves.toBe(PLAIN);
    await expect(trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN)).resolves.toBe(SHORT);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves a share that arrives while the first request is still open from the same promise', async () => {
    let release: (url: string | null) => void = () => {};
    const fetcher: ShareLinkFetcher = vi.fn(
      () => new Promise<string | null>((resolve) => { release = resolve; }),
    );

    const first = trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);
    const second = trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);
    release(SHORT);

    await expect(Promise.all([first, second])).resolves.toEqual([SHORT, SHORT]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('answers a queued share with the plain URL when the open request comes back empty', async () => {
    let release: (url: string | null) => void = () => {};
    const fetcher: ShareLinkFetcher = vi.fn(
      () => new Promise<string | null>((resolve) => { release = resolve; }),
    );

    const first = trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);
    const second = trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);
    release(null);

    await expect(Promise.all([first, second])).resolves.toEqual([PLAIN, PLAIN]);
  });

  it('clearShareLinkCache drops what a signed-out session had resolved', async () => {
    const fetcher: ShareLinkFetcher = vi.fn().mockResolvedValue(SHORT);

    await trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);
    clearShareLinkCache();
    await trackedShareUrl(fetcher, 'POD', 'DUN-POD-4821', PLAIN);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('trackedPodShareLinks', () => {
  const resolver = (): ShareUrlResolver =>
    vi.fn(async (target, _ref, plainUrl) =>
      target === 'POD' ? 'https://duncit.com/pod-code' : `${plainUrl}#tracked`,
    );

  it('resolves the pod page and its venue map together, each under its own campaign', async () => {
    const resolve = resolver();

    await expect(trackedPodShareLinks(resolve, 'DUN-POD-4821', PLAIN, MAP)).resolves.toEqual({
      url: 'https://duncit.com/pod-code',
      mapUrl: `${MAP}#tracked`,
    });
    expect(resolve).toHaveBeenCalledWith('POD', 'DUN-POD-4821', PLAIN);
    expect(resolve).toHaveBeenCalledWith('POD_LOCATION', 'DUN-POD-4821', MAP);
  });

  it('asks for no map link when the pod has no place to point at', async () => {
    const resolve = resolver();

    await expect(trackedPodShareLinks(resolve, 'DUN-POD-4821', PLAIN, null)).resolves.toEqual({
      url: 'https://duncit.com/pod-code',
      mapUrl: null,
    });
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('shares the plain links untouched when there is no pod id to attribute to', async () => {
    const resolve = resolver();

    await expect(trackedPodShareLinks(resolve, '', PLAIN, MAP)).resolves.toEqual({
      url: PLAIN,
      mapUrl: MAP,
    });
    expect(resolve).not.toHaveBeenCalled();
  });
});

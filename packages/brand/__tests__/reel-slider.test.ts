import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSiteReels,
  fillCopy,
  REEL_SLIDER_KEYS,
  reelPoster,
  reelSliderCopy,
  slideOffset,
  VISIBLE_DISTANCE,
  wrapIndex,
} from '../src/reel-slider';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reelSliderCopy', () => {
  it('resolves every control label through the translator', () => {
    const copy = reelSliderCopy((key) => `T(${key})`);
    expect(copy.next).toBe('T(website.brand.reels.next)');
    expect(Object.keys(copy).sort()).toEqual(Object.keys(REEL_SLIDER_KEYS).sort());
  });
});

describe('fillCopy', () => {
  it('fills known placeholders and leaves unknown ones intact', () => {
    expect(fillCopy('Slide {current} of {total} {oops}', { current: 2, total: 5 })).toBe('Slide 2 of 5 {oops}');
  });
  it('fills a repeated placeholder and a zero value', () => {
    expect(fillCopy('{n}/{n}', { n: 0 })).toBe('0/0');
  });
});

describe('slideOffset', () => {
  it('is zero for the active slide', () => {
    expect(slideOffset(2, 2, 5)).toBe(0);
  });
  it('places neighbours either side', () => {
    expect(slideOffset(3, 2, 5)).toBe(1);
    expect(slideOffset(1, 2, 5)).toBe(-1);
  });
  it('wraps the shorter way round', () => {
    expect(slideOffset(4, 0, 5)).toBe(-1);
    expect(slideOffset(0, 4, 5)).toBe(1);
  });
  it('keeps the exact half-way slide on the right', () => {
    expect(slideOffset(2, 0, 4)).toBe(2);
  });
  it('is zero for an empty track', () => {
    expect(slideOffset(0, 0, 0)).toBe(0);
    expect(slideOffset(3, 1, -2)).toBe(0);
  });
  it('exposes the visible distance used to draw neighbours', () => {
    expect(VISIBLE_DISTANCE).toBe(2);
  });
});

describe('wrapIndex', () => {
  it('steps forwards and wraps past the end', () => {
    expect(wrapIndex(1, 1, 3)).toBe(2);
    expect(wrapIndex(2, 1, 3)).toBe(0);
  });
  it('steps backwards and wraps past the start', () => {
    expect(wrapIndex(0, -1, 3)).toBe(2);
  });
  it('returns zero for an empty track', () => {
    expect(wrapIndex(0, 1, 0)).toBe(0);
  });
});

describe('reelPoster', () => {
  it('appends the ImageKit thumbnail path', () => {
    expect(reelPoster('https://ik.imagekit.io/duncit/reel.mp4')).toBe(
      'https://ik.imagekit.io/duncit/reel.mp4/ik-thumbnail.jpg'
    );
  });
  it('does not double a trailing slash and keeps the query', () => {
    expect(reelPoster('https://ik.test/a/b/?tr=x')).toBe('https://ik.test/a/b/ik-thumbnail.jpg?tr=x');
  });
  it('returns empty for something that is not a URL', () => {
    expect(reelPoster('not a url')).toBe('');
    expect(reelPoster('')).toBe('');
  });
});

describe('fetchSiteReels', () => {
  const reel = { id: '1', title: 'T', description: 'D', video_url: 'https://v.test/1.mp4' };

  it('posts the site and returns the reels in order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { publicWebsiteReels: [reel] } }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchSiteReels('https://api.test/gql', 'ADS')).toEqual([reel]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ site: 'ADS' });
  });

  it('answers an empty list and warns on GraphQL errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ errors: [{ message: 'x' }] }) }));
    expect(await fetchSiteReels('u', 'MAIN')).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('answers an empty list and warns on an HTTP failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }));
    expect(await fetchSiteReels('u', 'MAIN')).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[reel-slider] reels could not be loaded', 502, undefined);
  });

  it('answers an empty list and warns when the request throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchSiteReels('u', 'EARNWITH')).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[reel-slider] reels could not be loaded', expect.any(Error));
  });

  it('answers an empty list when the site has no reels field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: {} }) }));
    expect(await fetchSiteReels('u', 'PARTNERS')).toEqual([]);
  });
});

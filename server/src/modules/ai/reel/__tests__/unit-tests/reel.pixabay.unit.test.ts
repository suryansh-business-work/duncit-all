import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { cacheGet, cacheSet } from '@config/redis';
import { outboundFetch } from '@utils/outboundFetch';
import { PIXABAY_LICENCE, fitsAspect, searchPixabay } from '../../reel.pixabay';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@config/redis', () => ({ cacheGet: jest.fn(), cacheSet: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));
jest.mock('@modules/platform/upload/upload.service', () => ({ importRemoteMedia: jest.fn() }));

const env = getRuntimeEnvValue as jest.Mock;
const get = cacheGet as jest.Mock;
const set = cacheSet as jest.Mock;
const fetchMock = outboundFetch as jest.Mock;
const KEY = '12345678-0a1b2c3d4e5f60718293a4b5c';

function answer(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(init.headers ?? {}),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const photo = (id: number, width: number, height: number) => ({
  id,
  user: id === 1 ? 'Meera' : '',
  webformatURL: `https://pixabay.com/get/${id}_640.jpg`,
  largeImageURL: `https://pixabay.com/get/${id}_1280.jpg`,
  imageWidth: width,
  imageHeight: height,
});

const video = (id: number, files: Record<string, { width: number; height: number }>) => ({
  id,
  user: 'Arun',
  duration: 9,
  videos: Object.fromEntries(
    Object.entries(files).map(([size, dims]) => [size, { url: `https://cdn.pixabay.com/video/${id}_${size}.mp4`, ...dims, thumbnail: `https://cdn.pixabay.com/video/${id}_${size}.jpg` }])
  ),
});

beforeEach(() => {
  env.mockResolvedValue(` ${KEY} `);
  get.mockResolvedValue(null);
});

describe('searchPixabay', () => {
  it('refuses to search without a key and names the Tech portal category', async () => {
    env.mockResolvedValue('');
    await expect(searchPixabay({ query: 'dog', kind: 'IMAGE', aspect: 'PORTRAIT', page: 1, perPage: 24 })).rejects.toMatchObject({
      extensions: { code: 'CONFIG_ERROR', env_category: 'PIXABAY' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks for safe portrait photos and lists them with the Pixabay licence and credit', async () => {
    fetchMock.mockResolvedValue(answer({ totalHits: 60, hits: [photo(1, 1000, 1500), photo(2, 1500, 1000)] }));
    const page = await searchPixabay({ query: 'dog '.repeat(40), kind: 'IMAGE', aspect: 'PORTRAIT', page: 1, perPage: 24 });
    const url = new URL(fetchMock.mock.calls[0][1]);
    expect(url.origin + url.pathname).toBe('https://pixabay.com/api/');
    expect(url.searchParams.get('key')).toBe(KEY);
    expect(url.searchParams.get('orientation')).toBe('vertical');
    expect(url.searchParams.get('image_type')).toBe('photo');
    expect(url.searchParams.get('safesearch')).toBe('true');
    expect(url.searchParams.get('q')).toHaveLength(100);
    // The landscape photo is left out of a portrait reel's results.
    expect(page.items).toEqual([
      {
        id: 'pixabay-photo-1',
        kind: 'IMAGE',
        url: 'https://pixabay.com/get/1_1280.jpg',
        preview_url: 'https://pixabay.com/get/1_640.jpg',
        width: 1000,
        height: 1500,
        duration_ms: 0,
        licence: PIXABAY_LICENCE,
        attribution: 'Image by Meera on Pixabay',
        provider_id: '1',
        provider: 'PIXABAY',
      },
    ]);
    expect(page.has_more).toBe(true);
  });

  it('caches the answer for a day under a key that never holds the API key', async () => {
    fetchMock.mockResolvedValue(answer({ totalHits: 0, hits: [] }));
    await searchPixabay({ query: 'cat', kind: 'IMAGE', aspect: 'SQUARE', page: 2, perPage: 10 });
    const [cacheKey, , ttl] = set.mock.calls.find(([key]) => String(key).startsWith('reel:pixabay:?'));
    expect(cacheKey).not.toContain(KEY);
    expect(cacheKey).toContain('orientation=all');
    expect(ttl).toBe(86_400);
  });

  it('answers a search asked in the last day from the cache, without spending a request', async () => {
    get.mockImplementation(async (key: string) => (key.startsWith('reel:pixabay:videos/') ? { totalHits: 1, hits: [video(5, { medium: { width: 1080, height: 1920 } })] } : null));
    const page = await searchPixabay({ query: 'surf', kind: 'VIDEO', aspect: 'PORTRAIT', page: 1, perPage: 24 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(page.items[0]).toMatchObject({ id: 'pixabay-video-5', provider: 'PIXABAY' });
  });

  it('lists clips on the largest rendition that fits a reel frame, the right shape first', async () => {
    fetchMock.mockResolvedValue(
      answer({
        totalHits: 2,
        hits: [
          video(7, { large: { width: 3840, height: 2160 }, medium: { width: 1920, height: 1080 }, small: { width: 1280, height: 720 } }),
          video(8, { large: { width: 2160, height: 3840 }, medium: { width: 1080, height: 1920 } }),
          { id: 9, videos: {} },
        ],
      })
    );
    const page = await searchPixabay({ query: 'sea', kind: 'VIDEO', aspect: 'PORTRAIT', page: 1, perPage: 24 });
    expect(page.items.map((item) => item.id)).toEqual(['pixabay-video-8', 'pixabay-video-7']);
    expect(page.items[0]).toMatchObject({ url: 'https://cdn.pixabay.com/video/8_medium.mp4', width: 1080, height: 1920, duration_ms: 9000, attribution: 'Video by Arun on Pixabay' });
    expect(page.items[1]).toMatchObject({ url: 'https://cdn.pixabay.com/video/7_medium.mp4' });
    expect(page.has_more).toBe(false);
  });

  it('remembers the rate window Pixabay reports and refuses a search once it is spent', async () => {
    fetchMock.mockResolvedValue(answer({ totalHits: 0, hits: [] }, { headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '42' } }));
    await searchPixabay({ query: 'one', kind: 'IMAGE', aspect: 'PORTRAIT', page: 1, perPage: 24 });
    expect(set).toHaveBeenCalledWith('reel:pixabay:rate', { remaining: 0, reset_at: expect.any(Number) }, 42);

    get.mockImplementation(async (key: string) => (key === 'reel:pixabay:rate' ? { remaining: 0, reset_at: Date.now() + 30_000 } : null));
    fetchMock.mockClear();
    await expect(searchPixabay({ query: 'two', kind: 'IMAGE', aspect: 'PORTRAIT', page: 1, perPage: 24 })).rejects.toMatchObject({
      extensions: { code: 'RATE_LIMITED', retry_after_s: 30 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns a 429 into the limit message, and any other failure into an upstream error', async () => {
    fetchMock.mockResolvedValueOnce(answer({}, { status: 429, headers: { 'x-ratelimit-reset': '12' } }));
    await expect(searchPixabay({ query: 'a', kind: 'IMAGE', aspect: 'PORTRAIT', page: 1, perPage: 24 })).rejects.toMatchObject({
      message: expect.stringContaining('12 seconds'),
      extensions: { code: 'RATE_LIMITED' },
    });
    fetchMock.mockResolvedValueOnce(answer('[ERROR 400] "key" is invalid', { status: 400 }));
    await expect(searchPixabay({ query: 'b', kind: 'IMAGE', aspect: 'PORTRAIT', page: 1, perPage: 24 })).rejects.toMatchObject({
      message: expect.stringContaining('is invalid'),
      extensions: { code: 'UPSTREAM_ERROR' },
    });
    expect(set).not.toHaveBeenCalledWith(expect.stringContaining('?'), expect.anything(), expect.anything());
  });
});

describe('fitsAspect', () => {
  it.each([
    [1080, 1920, 'PORTRAIT', true],
    [1920, 1080, 'PORTRAIT', false],
    [1920, 1080, 'LANDSCAPE', true],
    [1000, 1050, 'SQUARE', true],
    [1000, 1500, 'SQUARE', false],
    [0, 0, 'PORTRAIT', true],
  ] as const)('%i×%i is %s: %s', (width, height, aspect, fits) => {
    expect(fitsAspect(width, height, aspect)).toBe(fits);
  });
});

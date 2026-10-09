/**
 * Importing a stock image or video from a trusted host, and the Pexels search
 * proxy. The outbound fetch, the Pexels key, the ImageKit credentials, the admin
 * Upload Settings and the image pipeline are faked; what is under test is the
 * SSRF allowlist, how a host's refusal is worded, the file name an import is
 * given, that an import obeys the same Upload Settings as any other upload, and
 * the search URL, clamping, orientation filter and response shaping.
 */
jest.mock('@observability/log', () => ({
  // Uploads are filed under the environment's root (uploadFolder.ts).
  SERVER_ENV: 'production',
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/platform/envEntry/envEntry.model', () => ({
  ...jest.requireActual('@modules/platform/envEntry/envEntry.model'),
  EnvEntryModel: {
    find: () => ({ lean: async () => [{ name: 'ImageKit', config: { private_key: 'private_fake_key' } }] }),
  },
}));
jest.mock('@modules/ai/aiMonitoring/aiMonitoring.service', () => ({ mediaScanService: { record: jest.fn() } }));
jest.mock('../../mediaProcessing', () => ({
  ...jest.requireActual('../../mediaProcessing'),
  getUploadSettingsSafe: jest.fn(),
  processImageBytes: jest.fn(),
}));

import { outboundFetch } from '@utils/outboundFetch';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUploadSettingsSafe, processImageBytes } from '../../mediaProcessing';
import { importRemoteImage, importRemoteMedia, pexelsSearch, pexelsSearchVideos } from '../../upload.service';

const fetchMock = outboundFetch as jest.Mock;
const envValue = getRuntimeEnvValue as jest.Mock;
const settings = getUploadSettingsSafe as jest.Mock;
const processBytes = processImageBytes as jest.Mock;

const IMAGEKIT_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const MB = 1024 * 1024;

const remote = (contentType: string | null, body = 'remote-bytes', over: Record<string, unknown> = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
  arrayBuffer: async () => new Uint8Array(Buffer.from(body)).buffer,
  ...over,
});

const imagekitOk = { ok: true, json: async () => ({ url: 'https://ik.example.test/imported', fileId: 'f-imp' }) };

/** The remote host answers first, then ImageKit takes the upload. */
const arrangeImport = (response: unknown) => {
  fetchMock.mockImplementation(async (_service: string, url: string) => (url === IMAGEKIT_URL ? imagekitOk : response));
};

const uploadCall = () => fetchMock.mock.calls.find((c) => c[1] === IMAGEKIT_URL);
const uploadedName = () => (uploadCall()?.[2].body as FormData).get('fileName');

const fakeSetting = (over: Record<string, unknown> = {}) => ({
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: ['jpg', 'png', 'webp'],
  allowed_video_formats: ['mp4'],
  ...over,
});

beforeEach(() => {
  settings.mockResolvedValue(null);
  envValue.mockResolvedValue(' pexels-fake-key ');
});

describe.each([
  ['importRemoteImage', importRemoteImage],
  ['importRemoteMedia', importRemoteMedia],
])('%s — the allowlist', (_name, importFn) => {
  it('rejects a string that is not a URL', async () => {
    await expect(importFn({ remoteUrl: 'not a url' })).rejects.toMatchObject({
      message: 'Invalid remote URL',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('rejects a non-http(s) scheme', async () => {
    await expect(importFn({ remoteUrl: 'ftp://images.pexels.com/a.jpg' })).rejects.toMatchObject({
      message: 'Only http(s) URLs are allowed',
    });
  });

  it('rejects a host outside the media allowlist (no SSRF)', async () => {
    await expect(importFn({ remoteUrl: 'https://internal.example.test/a.jpg' })).rejects.toMatchObject({
      message: 'Only Pexels / Unsplash / ImageKit URLs may be imported (got internal.example.test)',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['https://images.pexels.com/p.jpg', 'Pexels'],
    ['https://images.unsplash.com/p.jpg', 'Unsplash'],
    ['https://ik.imagekit.io/p.jpg', 'ImageKit'],
  ])('names the host when %s refuses', async (url, service) => {
    arrangeImport(remote('image/jpeg', '', { ok: false, status: 404, statusText: 'Not Found' }));

    await expect(importFn({ remoteUrl: url })).rejects.toMatchObject({
      message: `${service} could not send that image (404 Not Found).`,
      extensions: { code: 'UPSTREAM_ERROR', reason: '404 Not Found' },
    });
    expect(fetchMock).toHaveBeenCalledWith(service, url);
  });
});

describe('importRemoteImage', () => {
  it('refuses a response that is not an image', async () => {
    arrangeImport(remote('text/html'));
    await expect(importRemoteImage({ remoteUrl: 'https://images.pexels.com/p' })).rejects.toMatchObject({
      message: 'Remote URL did not return an image (got text/html)',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('treats a missing content type as JPEG and names the file by time + random suffix', async () => {
    arrangeImport(remote(null));

    const res = await importRemoteImage({ remoteUrl: 'https://images.pexels.com/p', folder: '/stock', tags: ['pexels'] });

    expect(res).toEqual({ url: 'https://ik.example.test/imported', fileId: 'f-imp', thumbnailUrl: undefined });
    expect(uploadedName()).toMatch(/^import-\d+-[0-9a-f]{8}\.jpg$/);
    const form = uploadCall()?.[2].body as FormData;
    expect(form.get('folder')).toBe('/production/stock');
    expect(form.get('tags')).toBe('pexels');
  });

  it('keeps a given name with an extension, sanitised, and appends one when it has none', async () => {
    arrangeImport(remote('image/png; charset=binary'));
    await importRemoteImage({ remoteUrl: 'https://images.pexels.com/p', fileName: 'sun set.png' });
    expect(uploadedName()).toBe('sun_set.png');

    fetchMock.mockClear();
    arrangeImport(remote('image/webp'));
    await importRemoteImage({ remoteUrl: 'https://images.pexels.com/p', fileName: 'beach' });
    expect(uploadedName()).toBe('beach.webp');
  });

  it('obeys the surface’s Upload Settings: size cap and the image pipeline', async () => {
    settings.mockResolvedValue(fakeSetting({ max_image_mb: 1 }));
    arrangeImport(remote('image/jpeg', 'x'.repeat(MB + 1)));
    await expect(
      importRemoteImage({ remoteUrl: 'https://images.pexels.com/p', surface: 'PORTALS' })
    ).rejects.toMatchObject({ message: 'Image is too large (max 1 MB)' });
    expect(settings).toHaveBeenCalledWith('PORTALS');
    expect(uploadCall()).toBeUndefined();

    fetchMock.mockClear();
    settings.mockResolvedValue(fakeSetting());
    processBytes.mockResolvedValue(Buffer.from('compressed'));
    arrangeImport(remote('image/jpeg', 'original'));
    await importRemoteImage({ remoteUrl: 'https://images.pexels.com/p', fileName: 'a.jpg' });
    expect(processBytes).toHaveBeenCalledWith(
      expect.objectContaining({ fileBytes: Buffer.from('original'), mimeType: 'image/jpeg', forceJpeg: false })
    );
    const sent = (uploadCall()?.[2].body as FormData).get('file') as Blob;
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('compressed');
  });
});

describe('importRemoteMedia', () => {
  it('refuses a response that is neither image nor video (missing type reads as binary)', async () => {
    arrangeImport(remote(null));
    await expect(importRemoteMedia({ remoteUrl: 'https://videos.pexels.com/v' })).rejects.toMatchObject({
      message: 'Remote URL must be image or video (got application/octet-stream)',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('imports a video untouched, even with Upload Settings present', async () => {
    settings.mockResolvedValue(fakeSetting());
    arrangeImport(remote('video/mp4', 'video-bytes'));

    await importRemoteMedia({ remoteUrl: 'https://videos.pexels.com/v', fileName: 'surf' });

    expect(uploadedName()).toBe('surf.mp4');
    expect(processBytes).not.toHaveBeenCalled();
    const sent = (uploadCall()?.[2].body as FormData).get('file') as Blob;
    expect(Buffer.from(await sent.arrayBuffer()).toString()).toBe('video-bytes');
  });

  it('caps a video by the admin video limit', async () => {
    settings.mockResolvedValue(fakeSetting({ max_video_mb: 1 }));
    arrangeImport(remote('video/mp4', 'v'.repeat(MB + 1)));
    await expect(importRemoteMedia({ remoteUrl: 'https://videos.pexels.com/v' })).rejects.toMatchObject({
      message: 'Video is too large (max 1 MB)',
    });
  });

  it('falls back to mp4 / jpg when the content type has no subtype', async () => {
    arrangeImport(remote('video/'));
    await importRemoteMedia({ remoteUrl: 'https://videos.pexels.com/v', fileName: 'clip' });
    expect(uploadedName()).toBe('clip.mp4');

    fetchMock.mockClear();
    arrangeImport(remote('image/'));
    await importRemoteMedia({ remoteUrl: 'https://images.pexels.com/p', fileName: 'pic' });
    expect(uploadedName()).toBe('pic.jpg');
  });

  it('runs an image through the admin pipeline and names an unnamed import', async () => {
    settings.mockResolvedValue(fakeSetting());
    processBytes.mockResolvedValue(Buffer.from('compressed'));
    arrangeImport(remote('image/jpeg', 'original'));

    await importRemoteMedia({ remoteUrl: 'https://images.pexels.com/p', tags: ['stock'] });

    expect(processBytes).toHaveBeenCalledTimes(1);
    expect(uploadedName()).toMatch(/^import-\d+-[0-9a-f]{8}\.jpg$/);
    expect((uploadCall()?.[2].body as FormData).get('tags')).toBe('stock');
  });
});

const pexelsReply = (json: unknown, over: Record<string, unknown> = {}) =>
  fetchMock.mockResolvedValue({ ok: true, statusText: 'OK', json: async () => json, ...over });

describe('pexelsSearch', () => {
  it('refuses when no Pexels key is configured', async () => {
    envValue.mockResolvedValue('   ');
    await expect(pexelsSearch({ query: 'cats' })).rejects.toMatchObject({
      message: 'Pexels is not configured',
      extensions: { code: 'CONFIG_ERROR' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches with an encoded query, clamped paging and the orientation, under the trimmed key', async () => {
    pexelsReply({ photos: [] });

    await pexelsSearch({ query: ' red & blue ', page: -3, perPage: 500, orientation: 'portrait' });

    expect(envValue).toHaveBeenCalledWith('PEXELS_API_KEY');
    expect(fetchMock).toHaveBeenCalledWith(
      'Pexels',
      'https://api.pexels.com/v1/search?query=red%20%26%20blue&per_page=80&page=1&orientation=portrait',
      { headers: { Authorization: 'pexels-fake-key' } }
    );
  });

  it('lists curated photos with default paging when there is no query, ignoring an unknown orientation', async () => {
    pexelsReply({ photos: [] });
    const res = await pexelsSearch({ orientation: 'diagonal' });
    expect(fetchMock.mock.calls[0][1]).toBe('https://api.pexels.com/v1/curated?per_page=24&page=1');
    expect(res).toEqual({ page: 1, per_page: 24, total_results: 0, next_page: null, photos: [] });
  });

  it('shapes photos, preferring large2x, and passes through Pexels’ paging', async () => {
    pexelsReply({
      page: 3,
      per_page: 2,
      total_results: 900,
      next_page: 'https://api.pexels.com/v1/search?page=4',
      photos: [
        {
          id: 11,
          width: 4000,
          height: 3000,
          photographer: 'Pat',
          photographer_url: 'https://www.pexels.com/@pat',
          avg_color: '#112233',
          alt: 'A dog',
          url: 'https://www.pexels.com/photo/11',
          src: { original: 'o.jpg', large2x: 'l2.jpg', large: 'l.jpg', medium: 'm.jpg', tiny: 't.jpg' },
        },
        { id: 12, width: 10, height: 10, src: { large: 'l-only.jpg' } },
      ],
    });

    const res = await pexelsSearch({ query: 'dog', page: 3, perPage: 2 });

    expect(res).toEqual({
      page: 3,
      per_page: 2,
      total_results: 900,
      next_page: 'https://api.pexels.com/v1/search?page=4',
      photos: [
        {
          id: '11',
          width: 4000,
          height: 3000,
          photographer: 'Pat',
          photographer_url: 'https://www.pexels.com/@pat',
          avg_color: '#112233',
          alt: 'A dog',
          url: 'https://www.pexels.com/photo/11',
          src_original: 'o.jpg',
          src_large: 'l2.jpg',
          src_medium: 'm.jpg',
          src_tiny: 't.jpg',
        },
        {
          id: '12',
          width: 10,
          height: 10,
          photographer: undefined,
          photographer_url: undefined,
          avg_color: undefined,
          alt: '',
          url: undefined,
          src_original: undefined,
          src_large: 'l-only.jpg',
          src_medium: undefined,
          src_tiny: undefined,
        },
      ],
    });
  });

  it.each([
    ['landscape', ['wide', 'nodims']],
    ['portrait', ['tall', 'nodims']],
    ['square', ['square', 'nodims']],
  ])('keeps only %s photos (and any without dimensions)', async (orientation, kept) => {
    pexelsReply({
      photos: [
        { id: 'wide', width: 1600, height: 900 },
        { id: 'tall', width: 900, height: 1600 },
        { id: 'square', width: 1000, height: 1050 },
        { id: 'nodims', width: 0, height: 0 },
      ],
    });

    const res = await pexelsSearch({ query: 'x', orientation });

    expect(res.photos.map((p: { id: string }) => p.id)).toEqual(kept);
    expect(res.total_results).toBe(kept.length);
  });

  it('words a failed search with Pexels’ error, or the status text when the body is unreadable', async () => {
    pexelsReply({ error: 'Rate limit exceeded' }, { ok: false, statusText: 'Too Many Requests' });
    await expect(pexelsSearch({ query: 'x' })).rejects.toMatchObject({
      message: 'Pexels search failed: Rate limit exceeded',
      extensions: { code: 'UPSTREAM_ERROR' },
    });

    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new SyntaxError('not json');
      },
    });
    await expect(pexelsSearch({ query: 'x' })).rejects.toMatchObject({ message: 'Pexels search failed: Bad Gateway' });
  });
});

describe('pexelsSearchVideos', () => {
  it('refuses when no Pexels key is configured', async () => {
    envValue.mockResolvedValue('');
    await expect(pexelsSearchVideos({})).rejects.toMatchObject({ message: 'Pexels is not configured' });
  });

  it('builds the search and popular URLs with clamped paging', async () => {
    pexelsReply({ videos: [] });
    await pexelsSearchVideos({ query: 'surf', page: 2, perPage: 0, orientation: 'landscape' });
    await pexelsSearchVideos({ page: 0, perPage: -4 });

    expect(fetchMock.mock.calls[0][1]).toBe(
      'https://api.pexels.com/videos/search?query=surf&per_page=24&page=2&orientation=landscape'
    );
    expect(fetchMock.mock.calls[1][1]).toBe('https://api.pexels.com/videos/popular?per_page=1&page=1');
  });

  it('shapes videos: mp4 files only, the first picture as preview, safe defaults', async () => {
    pexelsReply({
      videos: [
        {
          id: 21,
          width: 1920,
          height: 1080,
          duration: 12,
          url: 'https://www.pexels.com/video/21',
          image: 'poster.jpg',
          user: { name: 'Vee', url: 'https://www.pexels.com/@vee' },
          video_files: [
            { id: 1, file_type: 'video/mp4', quality: 'hd', width: 1280, height: 720, link: 'hd.mp4' },
            { id: 2, file_type: 'video/webm', link: 'x.webm' },
            { id: 3, link: 'no-type' },
            { id: 4, file_type: 'VIDEO/MP4', link: 'sd.mp4' },
          ],
          video_pictures: [{ picture: '' }, { picture: 'frame.jpg' }],
        },
        { id: 22, width: 0, height: 0, image: 'poster2.jpg' },
      ],
    });

    const res = await pexelsSearchVideos({ query: 'x' });

    expect(res).toEqual({
      page: 1,
      per_page: 24,
      total_results: 2,
      next_page: null,
      videos: [
        {
          id: '21',
          width: 1920,
          height: 1080,
          duration: 12,
          url: 'https://www.pexels.com/video/21',
          image: 'poster.jpg',
          user_name: 'Vee',
          user_url: 'https://www.pexels.com/@vee',
          preview: 'frame.jpg',
          video_files: [
            { id: '1', quality: 'hd', width: 1280, height: 720, link: 'hd.mp4' },
            { id: '4', quality: '', width: 0, height: 0, link: 'sd.mp4' },
          ],
        },
        {
          id: '22',
          width: 0,
          height: 0,
          duration: undefined,
          url: undefined,
          image: 'poster2.jpg',
          user_name: '',
          user_url: '',
          preview: 'poster2.jpg',
          video_files: [],
        },
      ],
    });
  });

  it.each([
    ['landscape', ['wide']],
    ['portrait', ['tall']],
    ['square', ['square']],
  ])('keeps only %s videos', async (orientation, kept) => {
    pexelsReply({
      page: 1,
      per_page: 3,
      total_results: 3,
      videos: [
        { id: 'wide', width: 1920, height: 1080 },
        { id: 'tall', width: 1080, height: 1920 },
        { id: 'square', width: 1080, height: 1080 },
      ],
    });
    const res = await pexelsSearchVideos({ query: 'x', orientation });
    expect(res.videos.map((v: { id: string }) => v.id)).toEqual(kept);
    // Pexels' own total is passed through, not the filtered count.
    expect(res.total_results).toBe(3);
  });

  it('words a failed video search with Pexels’ error or the status text', async () => {
    pexelsReply({ error: 'Forbidden key' }, { ok: false, statusText: 'Forbidden' });
    await expect(pexelsSearchVideos({ query: 'x' })).rejects.toMatchObject({
      message: 'Pexels video search failed: Forbidden key',
      extensions: { code: 'UPSTREAM_ERROR' },
    });
    pexelsReply({}, { ok: false, statusText: 'Forbidden' });
    await expect(pexelsSearchVideos({ query: 'x' })).rejects.toMatchObject({
      message: 'Pexels video search failed: Forbidden',
    });
  });
});

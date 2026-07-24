import { uploadResolvers } from '../../upload.resolver';
import { makeContext } from '@test/harness';

jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async () => 'test-value'),
}));

// getUploadSettingsSafe is the seam that decides whether the admin size/format
// caps apply. Default = null (no DB, matches the un-mocked runtime); individual
// tests override it with a fake row to exercise the setting-present branches.
jest.mock('../../mediaProcessing', () => {
  const actual = jest.requireActual('../../mediaProcessing');
  return { ...actual, getUploadSettingsSafe: jest.fn(async () => null) };
});

import { getUploadSettingsSafe } from '../../mediaProcessing';
import { getImagekitAuth, uploadBase64Image } from '../../upload.service';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

const mockSettings = getUploadSettingsSafe as jest.Mock;
const mockEnv = getRuntimeEnvValue as jest.Mock;

const setImagekitKeys = (pub: string, priv: string, url: string) =>
  mockEnv.mockImplementation(async (key: string) => {
    if (key === 'IMAGEKIT_PUBLIC_KEY') return pub;
    if (key === 'IMAGEKIT_PRIVATE_KEY') return priv;
    if (key === 'IMAGEKIT_URL_ENDPOINT') return url;
    return 'test-value';
  });

const MB = 1024 * 1024;
const videoBase64 = (bytes: number) => Buffer.alloc(bytes).toString('base64');

/** A settings row with compression off so image bytes pass through untouched. */
const fakeSetting = (over: Record<string, unknown> = {}) => ({
  surface: 'MOBILE',
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  allowed_video_formats: ['mp4', 'mov', 'webm'],
  image_compression_enabled: false,
  image_quality: 80,
  image_max_dimension: 1920,
  video_compression_enabled: false,
  video_crf: 28,
  video_max_height: 1080,
  ai_image_monitoring_enabled: false,
  default_crop_key: 'NO_CROP',
  crop_presets: [],
  ...over,
});

const mockImagekitOk = () =>
  jest.spyOn(global, 'fetch' as any).mockResolvedValue({
    ok: true,
    json: async () => ({ url: 'https://cdn/out', fileId: 'f1' }),
  } as any);

describe('upload unit', () => {
  it('getImagekitAuth requires authentication', async () => {
    await expect(
      (async () => (uploadResolvers.Query as any).getImagekitAuth({}, {}, makeContext(null)))()
    ).rejects.toThrow();
  });

  it('pexelsSearch requires authentication', async () => {
    await expect(
      (async () => (uploadResolvers.Query as any).pexelsSearch({}, { query: 'cats' }, makeContext(null)))()
    ).rejects.toThrow();
  });

  it('rejects a video just over the 50 MB cap', async () => {
    await expect(
      uploadBase64Image({
        fileBase64: videoBase64(50 * MB + 1),
        fileName: 'clip.mp4',
        mimeType: 'video/mp4',
      })
    ).rejects.toThrow('Video is too large (max 50 MB)');
  });

  it('caps a video by its extension even when the mimeType is missing (empty MIME bypass)', async () => {
    await expect(
      uploadBase64Image({
        fileBase64: videoBase64(50 * MB + 1),
        fileName: 'clip.mp4',
        mimeType: '',
        allowDocuments: true,
      })
    ).rejects.toThrow('Video is too large (max 50 MB)');
  });

  it('accepts a video at the 50 MB boundary (passes the size gate)', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://cdn/clip.mp4', fileId: 'f1' }),
      } as any);
    try {
      const res = await uploadBase64Image({
        fileBase64: videoBase64(50 * MB),
        fileName: 'clip.mp4',
        mimeType: 'video/mp4',
      });
      expect(res.url).toBe('https://cdn/clip.mp4');
    } finally {
      fetchMock.mockRestore();
    }
  });

  describe('admin Upload Settings enforcement (settings present)', () => {
    it('enforces the admin max_video_mb instead of the hardcoded 50 MB cap', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ max_video_mb: 1 }));
      await expect(
        uploadBase64Image({
          fileBase64: videoBase64(2 * MB),
          fileName: 'clip.mp4',
          mimeType: 'video/mp4',
          surface: 'MOBILE',
        }),
      ).rejects.toThrow('Video is too large (max 1 MB)');
    });

    it('enforces the admin max_image_mb cap', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ max_image_mb: 1 }));
      await expect(
        uploadBase64Image({
          fileBase64: videoBase64(2 * MB),
          fileName: 'a.gif',
          mimeType: 'image/gif',
          surface: 'MOBILE',
        }),
      ).rejects.toThrow('Image is too large (max 1 MB)');
    });

    it('rejects a disallowed non-processable image format (gif removed from the allow-list)', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ allowed_image_formats: ['jpg'] }));
      await expect(
        uploadBase64Image({
          fileBase64: Buffer.from('GIF89a').toString('base64'),
          fileName: 'a.gif',
          mimeType: 'image/gif',
          surface: 'MOBILE',
        }),
      ).rejects.toThrow('Image format .gif is not allowed');
    });

    it('rejects a disallowed video format even under the size cap', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ allowed_video_formats: ['webm'] }));
      await expect(
        uploadBase64Image({
          fileBase64: videoBase64(1 * MB),
          fileName: 'clip.mp4',
          mimeType: 'video/mp4',
          surface: 'MOBILE',
        }),
      ).rejects.toThrow('Video format .mp4 is not allowed');
    });

    it('uploads an allowed image (gif kept in the allow-list) through the settings path', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting());
      const fetchMock = mockImagekitOk();
      try {
        const res = await uploadBase64Image({
          fileBase64: Buffer.from('GIF89a').toString('base64'),
          fileName: 'a.gif',
          mimeType: 'image/gif',
          surface: 'MOBILE',
        });
        expect(res.url).toBe('https://cdn/out');
      } finally {
        fetchMock.mockRestore();
      }
    });

    it('lets an extension-less image pass the format guard and uploads it', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting());
      const fetchMock = mockImagekitOk();
      try {
        const res = await uploadBase64Image({
          fileBase64: Buffer.from('not-a-real-png').toString('base64'),
          fileName: 'photo',
          mimeType: 'image/png',
          surface: 'MOBILE',
        });
        expect(res.url).toBe('https://cdn/out');
      } finally {
        fetchMock.mockRestore();
      }
    });

    it('re-encodes a disallowed-but-processable format (png not in the allow-list) instead of rejecting', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ allowed_image_formats: ['jpg'] }));
      const fetchMock = mockImagekitOk();
      try {
        const res = await uploadBase64Image({
          fileBase64: Buffer.from('not-a-real-png').toString('base64'),
          fileName: 'a.png',
          mimeType: 'image/png',
          surface: 'MOBILE',
        });
        expect(res.url).toBe('https://cdn/out');
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  describe('getImagekitAuth config validation', () => {
    afterEach(() => mockEnv.mockImplementation(async () => 'test-value'));

    it('returns signed auth params for a valid key pair', async () => {
      setImagekitKeys('public_abc', 'private_xyz', 'https://ik.imagekit.io/duncit');
      const auth = await getImagekitAuth();
      expect(auth.publicKey).toBe('public_abc');
      expect(auth.urlEndpoint).toBe('https://ik.imagekit.io/duncit');
      expect(auth.token).toMatch(/^[0-9a-f]{32}$/);
      expect(auth.signature).toMatch(/^[0-9a-f]{40}$/);
      expect(auth.expire).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it.each([
      ['', 'private_xyz', 'https://x', /IMAGEKIT_PUBLIC_KEY is missing/],
      ['bad', 'private_xyz', 'https://x', /IMAGEKIT_PUBLIC_KEY is malformed/],
      ['public_abc', '', 'https://x', /IMAGEKIT_PRIVATE_KEY is missing/],
      ['public_abc', 'bad', 'https://x', /swapped/],
      ['public_abc', 'private_xyz', '', /IMAGEKIT_URL_ENDPOINT is missing/],
      ['public_abc', 'private_xyz', 'ftp://x', /IMAGEKIT_URL_ENDPOINT must be a URL/],
    ])('rejects a misconfigured key pair (%s / %s / %s)', async (pub, priv, url, expected) => {
      setImagekitKeys(pub, priv, url);
      await expect(getImagekitAuth()).rejects.toThrow(expected);
    });
  });

  it('uploads a small image on the fallback cap when settings are unavailable', async () => {
    const fetchMock = mockImagekitOk();
    try {
      const res = await uploadBase64Image({
        fileBase64: Buffer.from('GIF89a').toString('base64'),
        fileName: 'a.gif',
        mimeType: 'image/gif',
      });
      expect(res.url).toBe('https://cdn/out');
    } finally {
      fetchMock.mockRestore();
    }
  });
});

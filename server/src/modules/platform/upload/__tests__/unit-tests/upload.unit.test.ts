import { uploadResolvers } from '../../upload.resolver';
import { makeContext } from '@test/harness';

jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async () => 'test-value'),
}));

import { uploadBase64Image } from '../../upload.service';

const MB = 1024 * 1024;
const videoBase64 = (bytes: number) => Buffer.alloc(bytes).toString('base64');

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
});

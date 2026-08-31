import { uploadResolvers } from '../../upload.resolver';
import { makeContext } from '@test/harness';

jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async () => 'test-value'),
}));

/**
 * The ImageKit credentials come from ONE EnvEntry, so the model is the seam.
 *
 * It used to be three `getRuntimeEnvValue` calls, which is exactly the defect
 * this now guards: three lookups can answer from three records.
 */
jest.mock('@modules/platform/envEntry/envEntry.model', () => ({
  // Only the model: this module also exports ENV_CATEGORIES, which the SDL's
  // drift guard reads at import time and throws without.
  ...jest.requireActual('@modules/platform/envEntry/envEntry.model'),
  EnvEntryModel: { find: () => ({ lean: async () => imagekitEntries }) },
}));

const WORKING_IMAGEKIT = [
  {
    name: 'ImageKit',
    config: {
      public_key: 'public_test',
      private_key: 'private_test',
      url_endpoint: 'https://ik.imagekit.io/duncit',
    },
  },
];

let imagekitEntries: { name: string; config: Record<string, string> }[] = [...WORKING_IMAGEKIT];

// getUploadSettingsSafe is the seam that decides whether the admin size/format
// caps apply. Default = null (no DB, matches the un-mocked runtime); individual
// tests override it with a fake row to exercise the setting-present branches.
jest.mock('../../mediaProcessing', () => {
  const actual = jest.requireActual('../../mediaProcessing');
  return { ...actual, getUploadSettingsSafe: jest.fn(async () => null) };
});

import { getUploadSettingsSafe } from '../../mediaProcessing';
import {
  getImagekitAuth,
  uploadBase64Image,
  uploadSpooledFileToImagekit,
} from '../../upload.service';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const mockSettings = getUploadSettingsSafe as jest.Mock;
const mockEnv = getRuntimeEnvValue as jest.Mock;

const setImagekitKeys = (pub: string, priv: string, url: string) => {
  imagekitEntries = [
    { name: 'ImageKit', config: { public_key: pub, private_key: priv, url_endpoint: url } },
  ];
};

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

beforeEach(() => {
  imagekitEntries = [...WORKING_IMAGEKIT];
});

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

  describe('getImagekitAuth', () => {
    it('hands back a pass to our own upload route, not an ImageKit signature', async () => {
      setImagekitKeys('public_abc', 'private_xyz', 'https://ik.imagekit.io/duncit');
      const auth = await getImagekitAuth('u1', '/avatars');
      expect(auth.uploadUrl).toMatch(/\/upload$/);
      expect(auth.ticket).toMatch(/^[0-9a-f-]{36}$/);
      expect(auth.urlEndpoint).toBe('https://ik.imagekit.io/duncit');
      // No signature and no public key: a browser cannot sign an ImageKit
      // upload, and a mismatched key pair is what broke every upload before.
      expect(auth).not.toHaveProperty('signature');
      expect(auth).not.toHaveProperty('publicKey');
    });

    it('gives every upload its own pass, because a pass is spent once', async () => {
      setImagekitKeys('public_abc', 'private_xyz', 'https://ik.imagekit.io/duncit');
      const a = await getImagekitAuth('u1', '/avatars');
      const b = await getImagekitAuth('u1', '/avatars');
      expect(a.ticket).not.toBe(b.ticket);
    });

    it('refuses when ImageKit is not configured at all', async () => {
      setImagekitKeys('public_abc', '', 'https://x');
      await expect(getImagekitAuth('u1')).rejects.toThrow(/not configured/);
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

  /**
   * The streamed route (native picks, mWeb attachments, every direct video).
   * It went to ImageKit gated by the nginx ceiling alone, so lowering a cap in
   * the admin panel changed nothing for the app — these are that gap.
   */
  describe('spooled uploads obey the same Upload Settings', () => {
    const spool = async (name: string, bytes: number) => {
      const file = path.join(os.tmpdir(), `duncit-spool-test-${Date.now()}-${name}`);
      await fsp.writeFile(file, Buffer.alloc(bytes));
      return file;
    };

    it('refuses a video over the admin cap before a byte reaches ImageKit', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ max_video_mb: 40 }));
      const file = await spool('clip.mp4', 8);
      const fetchMock = mockImagekitOk();
      try {
        await expect(
          uploadSpooledFileToImagekit({
            filePath: file,
            fileName: 'clip.mp4',
            bytes: 41 * MB,
            surface: 'MOBILE',
          })
        ).rejects.toThrow('Video is too large (max 40 MB)');
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        fetchMock.mockRestore();
        await fsp.unlink(file).catch(() => undefined);
      }
    });

    it('refuses an image over the admin cap, by the IMAGE cap', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ max_image_mb: 2 }));
      const file = await spool('shot.png', 8);
      try {
        await expect(
          uploadSpooledFileToImagekit({
            filePath: file,
            fileName: 'shot.png',
            bytes: 3 * MB,
            surface: 'MWEB',
          })
        ).rejects.toThrow('Image is too large (max 2 MB)');
      } finally {
        await fsp.unlink(file).catch(() => undefined);
      }
    });

    it('refuses a format the admin removed from the allow-list', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting({ allowed_video_formats: ['mp4'] }));
      const file = await spool('clip.mov', 8);
      try {
        await expect(
          uploadSpooledFileToImagekit({
            filePath: file,
            fileName: 'clip.mov',
            bytes: 1024,
            surface: 'MOBILE',
          })
        ).rejects.toThrow('Video format .mov is not allowed');
      } finally {
        await fsp.unlink(file).catch(() => undefined);
      }
    });

    it('streams a video that fits, and returns the stored name', async () => {
      mockSettings.mockResolvedValueOnce(fakeSetting());
      const file = await spool('ok.mp4', 32);
      const fetchMock = mockImagekitOk();
      try {
        const res = await uploadSpooledFileToImagekit({
          filePath: file,
          fileName: 'ok.mp4',
          bytes: 32,
          surface: 'MOBILE',
        });
        expect(res.uploaded.url).toBe('https://cdn/out');
        expect(res.fileName).toBe('ok.mp4');
        expect(res.isImage).toBe(false);
      } finally {
        fetchMock.mockRestore();
        await fsp.unlink(file).catch(() => undefined);
      }
    });

    it('sanitises the name and uploads a document when settings cannot be read', async () => {
      mockSettings.mockResolvedValueOnce(null);
      const file = await spool('gst.pdf', 16);
      const fetchMock = mockImagekitOk();
      try {
        const res = await uploadSpooledFileToImagekit({
          filePath: file,
          fileName: 'my invoice!.pdf',
          bytes: 16,
        });
        expect(res.fileName).toBe('my_invoice_.pdf');
        expect(res.isImage).toBe(false);
      } finally {
        fetchMock.mockRestore();
        await fsp.unlink(file).catch(() => undefined);
      }
    });
  });
});

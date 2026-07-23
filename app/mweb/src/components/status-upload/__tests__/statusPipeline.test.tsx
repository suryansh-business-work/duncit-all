import { beforeEach, describe, expect, it, vi } from 'vitest';

const directUploadToImagekit = vi.fn();
const compressUploadedVideo = vi.fn();
const mutate = vi.fn();

vi.mock('@duncit/media-picker', () => ({
  directUploadToImagekit: (...args: unknown[]) => directUploadToImagekit(...args),
  compressUploadedVideo: (...args: unknown[]) => compressUploadedVideo(...args),
}));

vi.mock('../../../apollo', () => ({
  apolloClient: {
    mutate: (...args: unknown[]) => mutate(...args),
  },
}));

import {
  STATUS_FOLDERS,
  mediaTypeOf,
  uploadStatusMedia,
} from '../statusPipeline';
import { UPLOAD_STATUS_MEDIA } from '../queries';

const imageFile = (name = 'pic.png', type = 'image/png') =>
  new File(['data'], name, { type });
const videoFile = (name = 'clip.mp4', type = 'video/mp4') =>
  new File(['data'], name, { type });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('STATUS_FOLDERS', () => {
  it('maps each kind to its ImageKit folder', () => {
    expect(STATUS_FOLDERS).toEqual({
      pod: '/pod-status',
      club: '/club-status',
      profile: '/posts',
    });
  });
});

describe('mediaTypeOf', () => {
  it('detects a video by mime prefix', () => {
    expect(mediaTypeOf(videoFile())).toBe('VIDEO');
  });

  it('treats everything else as an image', () => {
    expect(mediaTypeOf(imageFile())).toBe('IMAGE');
    expect(mediaTypeOf(imageFile('a.gif', 'image/gif'))).toBe('IMAGE');
  });
});

describe('uploadStatusMedia — video path', () => {
  it('streams to ImageKit then compresses, reporting banded progress', async () => {
    const stages: { progress: number; message: string }[] = [];
    directUploadToImagekit.mockImplementation(
      async (_client, _file, _folder, onProgress: (pct: number) => void) => {
        onProgress(100);
        return 'https://ik.io/raw.mp4';
      },
    );
    compressUploadedVideo.mockImplementation(
      async (
        _client,
        _raw,
        _folder,
        _surface,
        onProgress: (pct: number) => void,
      ) => {
        onProgress(100);
        return 'https://ik.io/final.mp4';
      },
    );

    const trim = { start: 0, end: 15, duration: 15 };
    const url = await uploadStatusMedia({
      file: videoFile(),
      kind: 'pod',
      trim,
      onStage: (s) => stages.push(s),
    });

    expect(url).toBe('https://ik.io/final.mp4');

    // direct upload got the pod folder
    expect(directUploadToImagekit).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(File),
      '/pod-status',
      expect.any(Function),
    );
    // compress got the raw url, folder, surface and the trim window
    expect(compressUploadedVideo).toHaveBeenCalledWith(
      expect.anything(),
      'https://ik.io/raw.mp4',
      '/pod-status',
      'MWEB',
      expect.any(Function),
      trim,
    );

    // 0 (start) -> 70 (upload 100%*0.7) -> 95 (70 + 100%*0.25)
    expect(stages[0]).toEqual({ progress: 0, message: 'Uploading status video...' });
    expect(stages).toContainEqual({ progress: 70, message: 'Uploading status video...' });
    expect(stages).toContainEqual({ progress: 95, message: 'Compressing video...' });
    expect(mutate).not.toHaveBeenCalled();
  });

  it('passes null trim when none is provided', async () => {
    directUploadToImagekit.mockResolvedValue('https://ik.io/raw.mp4');
    compressUploadedVideo.mockResolvedValue('https://ik.io/final.mp4');

    await uploadStatusMedia({
      file: videoFile(),
      kind: 'club',
      onStage: vi.fn(),
    });

    const compressArgs = compressUploadedVideo.mock.calls[0];
    expect(compressArgs[2]).toBe('/club-status');
    expect(compressArgs[5]).toBeNull();
  });
});

describe('uploadStatusMedia — image path', () => {
  it('base64-encodes, mutates with crop options and returns the url', async () => {
    const stages: { progress: number; message: string }[] = [];
    mutate.mockResolvedValue({
      data: { uploadImageToImagekit: { url: 'https://ik.io/pic.png' } },
    });

    const crop = { x: 1, y: 2, width: 3, height: 4 };
    const url = await uploadStatusMedia({
      file: imageFile(),
      kind: 'profile',
      crop,
      cropPreset: 'square',
      onStage: (s) => stages.push(s),
    });

    expect(url).toBe('https://ik.io/pic.png');

    expect(mutate).toHaveBeenCalledTimes(1);
    const call = mutate.mock.calls[0][0];
    expect(call.mutation).toBe(UPLOAD_STATUS_MEDIA);
    expect(call.variables).toMatchObject({
      fileName: 'pic.png',
      mimeType: 'image/png',
      folder: '/posts',
      crop,
      cropPreset: 'square',
    });
    expect(typeof call.variables.fileBase64).toBe('string');
    expect(call.variables.fileBase64.length).toBeGreaterThan(0);

    expect(stages).toContainEqual({ progress: 8, message: 'Preparing status upload...' });
    expect(stages).toContainEqual({ progress: 45, message: 'Uploading status media...' });
    expect(directUploadToImagekit).not.toHaveBeenCalled();
  });

  it('sends undefined crop options when omitted', async () => {
    mutate.mockResolvedValue({
      data: { uploadImageToImagekit: { url: 'https://ik.io/pic.png' } },
    });

    await uploadStatusMedia({
      file: imageFile(),
      kind: 'pod',
      onStage: vi.fn(),
    });

    const vars = mutate.mock.calls[0][0].variables;
    expect(vars.crop).toBeUndefined();
    expect(vars.cropPreset).toBeUndefined();
  });

  it('throws when the mutation returns no url', async () => {
    mutate.mockResolvedValue({ data: { uploadImageToImagekit: { url: null } } });

    await expect(
      uploadStatusMedia({ file: imageFile(), kind: 'pod', onStage: vi.fn() }),
    ).rejects.toThrow('Upload failed');
  });

  it('throws when the mutation returns no data at all', async () => {
    mutate.mockResolvedValue({ data: null });

    await expect(
      uploadStatusMedia({ file: imageFile(), kind: 'pod', onStage: vi.fn() }),
    ).rejects.toThrow('Upload failed');
  });
});

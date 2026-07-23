import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import type { CropResult } from '@/components/media-crop/MediaCropDialog';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/imagekit-upload', () => ({ uploadToImagekitDirect: jest.fn() }));
jest.mock('@/services/video-compression', () => ({ compressUploadedVideo: jest.fn() }));

const mockPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;
const mockDirect = uploadToImagekitDirect as jest.Mock;
const mockCompress = compressUploadedVideo as jest.Mock;

const asset = (over: Record<string, unknown> = {}) => ({
  canceled: false,
  assets: [
    {
      base64: 'abc',
      fileName: 'pic.jpg',
      mimeType: 'image/jpeg',
      type: 'image',
      uri: 'file://pic.jpg',
      width: 1920,
      height: 1080,
      fileSize: 2048,
      ...over,
    },
  ],
});

const CROP: CropResult = {
  cropRect: { x: 0, y: 0, width: 1600, height: 900 },
  cropPresetKey: 'RATIO_16_9',
};

beforeEach(() => jest.clearAllMocks());

async function pick(result: { current: ReturnType<typeof useMediaUpload> }) {
  await act(async () => {
    await result.current.pick();
  });
}

describe('useMediaUpload', () => {
  it('stages a picked image, then uploads it with the crop rect + preset on confirm', async () => {
    const onUploaded = jest.fn();
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(asset());
    mockRequest.mockResolvedValue({ uploadImageToImagekit: { url: 'https://ik/pod.jpg' } });
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));

    await pick(result);
    expect(result.current.pending?.kind).toBe('image');

    await act(async () => {
      await result.current.confirm(CROP);
    });
    expect(onUploaded).toHaveBeenCalledWith('https://ik/pod.jpg');
    expect(result.current.pending).toBeNull();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        folder: '/pods',
        surface: 'MOBILE',
        crop: CROP.cropRect,
        cropPreset: 'RATIO_16_9',
      }),
      { auth: true },
    );
  });

  it('sends no crop rect/preset for a No-Crop confirm and defaults missing metadata', async () => {
    const onUploaded = jest.fn();
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(
      asset({
        fileName: null,
        mimeType: undefined,
        width: undefined,
        height: undefined,
        fileSize: undefined,
      }),
    );
    mockRequest.mockResolvedValue({ uploadImageToImagekit: { url: 'https://ik/x.jpg' } });
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));

    await pick(result);
    expect(result.current.pending).toMatchObject({ width: 0, height: 0, fileSize: null });

    await act(async () => {
      await result.current.confirm({ cropRect: null, cropPresetKey: 'NO_CROP' });
    });
    const vars = mockRequest.mock.calls[0]?.[1];
    expect(vars.crop).toBeUndefined();
    expect(vars.cropPreset).toBeUndefined();
    expect(vars.mimeType).toBe('image/jpeg');
    expect(vars.fileName).toMatch(/^pod-\d+/);
  });

  it('streams a picked video from its URI and runs the FFmpeg pass on confirm', async () => {
    const onUploaded = jest.fn();
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(
      asset({
        type: 'video',
        uri: 'file://clip.mov',
        fileName: 'clip.mov',
        mimeType: 'video/quicktime',
        base64: undefined,
        duration: 5000,
      }),
    );
    mockDirect.mockResolvedValue('https://ik/raw.mov');
    mockCompress.mockResolvedValue('https://ik/small.mp4');
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));

    await pick(result);
    expect(result.current.pending?.kind).toBe('video');
    await act(async () => {
      await result.current.confirm({ cropRect: null, cropPresetKey: 'NO_CROP' });
    });
    expect(onUploaded).toHaveBeenCalledWith('https://ik/small.mp4');
    expect(mockDirect).toHaveBeenCalledWith(
      { uri: 'file://clip.mov', name: 'clip.mov', type: 'video/quicktime' },
      '/pods',
      expect.any(Function),
    );
    expect(mockCompress).toHaveBeenCalledWith('https://ik/raw.mov', '/pods', expect.any(Function));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('defaults a video mime type + name when the picker omits them', async () => {
    const onUploaded = jest.fn();
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(
      asset({
        type: 'video',
        uri: 'file://c',
        fileName: null,
        mimeType: undefined,
        base64: undefined,
      }),
    );
    mockDirect.mockResolvedValue('https://ik/raw.mp4');
    mockCompress.mockImplementation(async (url: string) => url);
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));

    await pick(result);
    expect(result.current.pending?.mimeType).toBe('video/mp4');
    expect(result.current.pending?.fileName).toMatch(/^pod-\d+\.mp4$/);
  });

  it('surfaces a denied permission and stages nothing', async () => {
    const onUploaded = jest.fn();
    mockPermission.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));
    await pick(result);
    expect(result.current.pending).toBeNull();
    expect(result.current.error).toMatch(/photo access/i);
  });

  it('stages nothing when the picker is cancelled', async () => {
    const onUploaded = jest.fn();
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue({ canceled: true, assets: [] });
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));
    await pick(result);
    expect(result.current.pending).toBeNull();
    expect(result.current.error).toBeUndefined();
  });

  it('clears the pending pick on cancel', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(asset());
    const { result } = renderHook(() => useMediaUpload('/pods', jest.fn()));
    await pick(result);
    expect(result.current.pending).not.toBeNull();
    act(() => result.current.cancel());
    expect(result.current.pending).toBeNull();
  });

  it('is a no-op when confirm is called with nothing pending', async () => {
    const onUploaded = jest.fn();
    const { result } = renderHook(() => useMediaUpload('/pods', onUploaded));
    await act(async () => {
      await result.current.confirm(CROP);
    });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('reports Error and non-Error upload failures', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(asset());
    const { result } = renderHook(() => useMediaUpload('/pods', jest.fn()));

    await pick(result);
    mockRequest.mockRejectedValueOnce(new Error('IK down'));
    await act(async () => {
      await result.current.confirm(CROP);
    });
    expect(result.current.error).toBe('IK down');

    mockRequest.mockRejectedValueOnce('nope');
    await act(async () => {
      await result.current.confirm(CROP);
    });
    expect(result.current.error).toBe('Upload failed');
  });
});

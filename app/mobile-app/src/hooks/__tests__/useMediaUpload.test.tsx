import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';
import { useMediaUpload } from '@/hooks/useMediaUpload';

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
  assets: [{ base64: 'abc', fileName: 'pic.jpg', mimeType: 'image/jpeg', type: 'image', ...over }],
});

beforeEach(() => jest.clearAllMocks());

describe('useMediaUpload', () => {
  it('uploads the picked asset and returns the hosted URL', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(asset());
    mockRequest.mockResolvedValue({ uploadImageToImagekit: { url: 'https://ik/pod.jpg' } });
    const { result } = renderHook(() => useMediaUpload('/pods'));
    let url: string | null = null;
    await act(async () => {
      url = await result.current.pickAndUpload();
    });
    expect(url).toBe('https://ik/pod.jpg');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ folder: '/pods', fileName: 'pic.jpg' }),
      { auth: true },
    );
  });

  it('falls back to a generated name and default mime type', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(asset({ fileName: null, mimeType: undefined }));
    mockRequest.mockResolvedValue({ uploadImageToImagekit: { url: 'https://ik/x.jpg' } });
    const { result } = renderHook(() => useMediaUpload('/pods'));
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockRequest.mock.calls[0]?.[1].mimeType).toBe('image/jpeg');
    expect(mockRequest.mock.calls[0]?.[1].fileName).toMatch(/^pod-\d+/);
  });

  it('streams picked videos from their URI and runs the FFmpeg pass', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(
      asset({
        type: 'video',
        uri: 'file://clip.mov',
        fileName: 'clip.mov',
        mimeType: 'video/quicktime',
        base64: undefined,
      }),
    );
    mockDirect.mockResolvedValue('https://ik/raw.mov');
    mockCompress.mockResolvedValue('https://ik/small.mp4');
    const { result } = renderHook(() => useMediaUpload('/pods'));
    let url: string | null = null;
    await act(async () => {
      url = await result.current.pickAndUpload();
    });
    expect(url).toBe('https://ik/small.mp4');
    expect(mockDirect).toHaveBeenCalledWith(
      { uri: 'file://clip.mov', name: 'clip.mov', type: 'video/quicktime' },
      '/pods',
    );
    expect(mockCompress).toHaveBeenCalledWith('https://ik/raw.mov', '/pods');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('defaults a video mime type to video/mp4', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(
      asset({
        type: 'video',
        uri: 'file://clip',
        fileName: 'clip.mp4',
        mimeType: undefined,
        base64: undefined,
      }),
    );
    mockDirect.mockResolvedValue('https://ik/raw.mp4');
    mockCompress.mockImplementation(async (url: string) => url);
    const { result } = renderHook(() => useMediaUpload('/pods'));
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockDirect.mock.calls[0]?.[0].type).toBe('video/mp4');
  });

  it('surfaces a denied permission', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useMediaUpload('/pods'));
    let url: string | null = 'x';
    await act(async () => {
      url = await result.current.pickAndUpload();
    });
    expect(url).toBeNull();
    expect(result.current.error).toMatch(/photo access/i);
  });

  it('returns null when the picker is cancelled', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue({ canceled: true, assets: [] });
    const { result } = renderHook(() => useMediaUpload('/pods'));
    let url: string | null = 'x';
    await act(async () => {
      url = await result.current.pickAndUpload();
    });
    expect(url).toBeNull();
    expect(result.current.error).toBeUndefined();
  });

  it('reports Error and non-Error upload failures', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLaunch.mockResolvedValue(asset());
    mockRequest.mockRejectedValueOnce(new Error('IK down'));
    const { result } = renderHook(() => useMediaUpload('/pods'));
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBe('IK down');
    mockRequest.mockRejectedValueOnce('nope');
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBe('Upload failed');
  });
});

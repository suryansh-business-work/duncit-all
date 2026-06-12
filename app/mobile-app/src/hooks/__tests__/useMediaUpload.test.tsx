import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { graphqlRequest } from '@/services/graphql.client';
import { useMediaUpload } from '@/hooks/useMediaUpload';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;

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

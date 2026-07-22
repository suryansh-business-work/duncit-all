import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { useProfilePostUpload } from '@/hooks/useProfilePostUpload';

const mockPublish = jest.fn();
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: unknown) => unknown) =>
    selector({ publish: mockPublish, progress: 0 }),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

beforeEach(() => {
  mockPublish.mockReset();
  reqPerm.mockReset();
  launch.mockReset();
});

describe('useProfilePostUpload', () => {
  it('publishes the picked image as a permanent POST (never a STORY)', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc', uri: 'file://p.jpg', fileName: 'p.jpg', mimeType: 'image/jpeg' }],
    });
    const { result } = renderHook(() => useProfilePostUpload());
    await act(async () => {
      await result.current.pickAndPost();
    });
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'] }));
    expect(mockPublish).toHaveBeenCalledWith({
      base64: 'abc',
      uri: 'file://p.jpg',
      fileName: 'p.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
      kind: 'POST',
    });
    expect(result.current.error).toBeUndefined();
  });

  it('sets an error when photo permission is denied', async () => {
    reqPerm.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useProfilePostUpload());
    await act(async () => {
      await result.current.pickAndPost();
    });
    expect(result.current.error).toBeDefined();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is cancelled', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: true });
    const { result } = renderHook(() => useProfilePostUpload());
    await act(async () => {
      await result.current.pickAndPost();
    });
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('surfaces a publish failure as an error', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', uri: 'file://p.jpg' }] });
    mockPublish.mockRejectedValue(new Error('upload failed'));
    const { result } = renderHook(() => useProfilePostUpload());
    await act(async () => {
      await result.current.pickAndPost();
    });
    expect(result.current.error).toBe('upload failed');
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', uri: 'file://p.jpg' }] });
    mockPublish.mockRejectedValue('weird');
    const { result } = renderHook(() => useProfilePostUpload());
    await act(async () => {
      await result.current.pickAndPost();
    });
    expect(result.current.error).toBe('Could not add your post.');
  });
});

import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { useStatusUpload } from '@/hooks/useStatusUpload';

const mockPublish = jest.fn();
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: unknown) => unknown) => selector({ publish: mockPublish }),
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

describe('useStatusUpload', () => {
  it('publishes the picked image when permission is granted', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc', fileName: 'x.jpg', mimeType: 'image/jpeg' }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockPublish).toHaveBeenCalledWith({
      base64: 'abc',
      fileName: 'x.jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('sets an error when permission is denied', async () => {
    reqPerm.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBeDefined();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is cancelled', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: true });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('surfaces a publish failure as an error', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc' }] });
    mockPublish.mockRejectedValue(new Error('upload failed'));
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBe('upload failed');
  });
});

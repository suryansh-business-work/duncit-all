import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { useStatusUpload } from '@/hooks/useStatusUpload';

const mockPublish = jest.fn();
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: unknown) => unknown) =>
    selector({ publish: mockPublish, progress: 0 }),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockNotify = jest.fn().mockResolvedValue('id');
jest.mock('@/services/notifications.service', () => ({
  scheduleLocalNotification: (...args: unknown[]) => mockNotify(...args),
}));

const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

beforeEach(() => {
  mockPublish.mockReset();
  reqPerm.mockReset();
  launch.mockReset();
  mockNotify.mockReset().mockResolvedValue('id');
});

describe('useStatusUpload', () => {
  it('publishes the picked image when permission is granted', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc', fileName: 'x.jpg', mimeType: 'image/jpeg', type: 'image' }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockPublish).toHaveBeenCalledWith({
      base64: 'abc',
      fileName: 'x.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'IMAGE',
    });
  });

  it('publishes a short video as a VIDEO story', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [
        { base64: 'vid', fileName: 'c.mp4', mimeType: 'video/mp4', type: 'video', duration: 12000 },
      ],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockPublish).toHaveBeenCalledWith({
      base64: 'vid',
      fileName: 'c.mp4',
      mimeType: 'video/mp4',
      mediaType: 'VIDEO',
    });
  });

  it('publishes a video with no reported duration as a VIDEO story', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'vid', type: 'video', mimeType: 'video/mp4' }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'VIDEO' }));
  });

  it('rejects a video longer than the 15s story cap with a warning (Bug 3)', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'vid', type: 'video', duration: 20000 }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toContain('20s');
    expect(result.current.error).toContain('15s');
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('posts start + success notifications, tolerating notification failures (Bug 1)', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', type: 'image' }] });
    mockNotify.mockReset().mockRejectedValue(new Error('no permission'));
    mockPublish.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    // Both the "posting" and "posted" notifications were attempted.
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeUndefined();
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
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', type: 'image' }] });
    mockPublish.mockRejectedValue(new Error('upload failed'));
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBe('upload failed');
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', type: 'image' }] });
    mockPublish.mockRejectedValue('weird');
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBe('Could not post story.');
  });
});

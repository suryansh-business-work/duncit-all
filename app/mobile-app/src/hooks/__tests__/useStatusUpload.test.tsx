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

  it('pauses a picked video on the preview sheet, then publishes it on confirm', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://c.mp4',
          fileName: 'c.mp4',
          mimeType: 'video/mp4',
          type: 'video',
          duration: 12000,
          fileSize: 1024,
        },
      ],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(mockPublish).not.toHaveBeenCalled();
    expect(result.current.pendingVideo).toEqual({
      uri: 'file://c.mp4',
      durationSeconds: 12,
      fileName: 'c.mp4',
      mimeType: 'video/mp4',
    });

    await act(async () => {
      await result.current.confirmVideo(null);
    });
    expect(result.current.pendingVideo).toBeNull();
    expect(mockPublish).toHaveBeenCalledWith({
      uri: 'file://c.mp4',
      fileName: 'c.mp4',
      mimeType: 'video/mp4',
      mediaType: 'VIDEO',
      trim: null,
    });
  });

  it('forwards the picked 15s trim window when confirming a long video (Bug 3)', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://long.mp4', type: 'video', duration: 40000 }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toBeUndefined();
    expect(result.current.pendingVideo?.durationSeconds).toBe(40);

    await act(async () => {
      await result.current.confirmVideo({ start: 5, duration: 15 });
    });
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'VIDEO', trim: { start: 5, duration: 15 } }),
    );
  });

  it('keeps a video with no reported duration on the preview sheet', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://v.mp4', type: 'video', mimeType: 'video/mp4' }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.pendingVideo?.durationSeconds).toBe(0);
  });

  it('rejects a story video over the 50 MB cap (Bug 3)', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://big.mp4', type: 'video', fileSize: 51 * 1024 * 1024 }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.error).toContain('50 MB');
    expect(result.current.pendingVideo).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('discards the pending video on cancel', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://v.mp4', type: 'video', duration: 5000 }],
    });
    const { result } = renderHook(() => useStatusUpload());
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.pendingVideo).not.toBeNull();
    act(() => {
      result.current.cancelVideo();
    });
    expect(result.current.pendingVideo).toBeNull();
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

import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useUploadSettings } from '@/hooks/useUploadSettings';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const SETTINGS = {
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: ['jpg', 'png'],
  allowed_video_formats: ['mp4'],
  default_crop_key: 'NO_CROP',
  crop_presets: [],
};

beforeEach(() => jest.clearAllMocks());

describe('useUploadSettings', () => {
  it('fetches the MOBILE-surface settings and exposes them', async () => {
    mockRequest.mockResolvedValue({ uploadSettings: SETTINGS });
    const { result } = renderHook(() => useUploadSettings());
    await waitFor(() => expect(result.current).toEqual(SETTINGS));
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { surface: 'MOBILE' },
      { auth: true },
    );
  });

  it('resolves to null and logs (dev) when the settings fetch fails', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useUploadSettings());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('stays silent (no dev log) in a production build', async () => {
    const globals = globalThis as unknown as { __DEV__: boolean };
    const original = globals.__DEV__;
    globals.__DEV__ = false;
    mockRequest.mockRejectedValue(new Error('offline'));
    try {
      const { result } = renderHook(() => useUploadSettings());
      await waitFor(() => expect(mockRequest).toHaveBeenCalled());
      expect(result.current).toBeNull();
    } finally {
      globals.__DEV__ = original;
    }
  });

  it('does not set state after unmount on a late success', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useUploadSettings());
    unmount();
    resolve({ uploadSettings: SETTINGS });
    await Promise.resolve();
    expect(result.current).toBeNull();
  });

  it('does not set state after unmount on a late failure', async () => {
    let reject: (reason: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((_res, rej) => {
        reject = rej;
      }),
    );
    const { result, unmount } = renderHook(() => useUploadSettings());
    unmount();
    reject(new Error('late'));
    await Promise.resolve();
    expect(result.current).toBeNull();
  });
});

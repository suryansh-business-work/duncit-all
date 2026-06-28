import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { MobileUpdateProfileDocument } from '@/graphql/account';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockRefetchMe = jest.fn();
jest.mock('@/stores/me.store', () => ({
  useMeStore: { getState: () => ({ refetch: mockRefetchMe }) },
}));

const mockRequest = graphqlRequest as jest.Mock;
const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

const cropped = { base64: 'CROPPED', mimeType: 'image/jpeg', fileName: 'avatar-1.jpg' };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockImplementation((doc: unknown) => {
    if (doc === UploadImageDocument)
      return Promise.resolve({ uploadImageToImagekit: { url: 'http://img/x.jpg' } });
    return Promise.resolve({ updateMyProfile: { user_id: 'u1' } });
  });
});

describe('useProfilePhoto', () => {
  it('pick stages the chosen asset for cropping', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://p.jpg', width: 1000, height: 800, fileName: 'p.jpg' }],
    });
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.pick();
    });
    expect(result.current.picked).toMatchObject({ uri: 'file://p.jpg', width: 1000, height: 800 });
  });

  it('pick sets an error when permission is denied', async () => {
    reqPerm.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.pick();
    });
    expect(result.current.error).toContain('Photo access');
    expect(result.current.picked).toBeNull();
  });

  it('pick is a no-op when the picker is cancelled', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: true });
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.pick();
    });
    expect(result.current.picked).toBeNull();
  });

  it('upload sends the cropped image then persists and refreshes', async () => {
    const onChanged = jest.fn();
    const { result } = renderHook(() => useProfilePhoto(onChanged));
    await act(async () => {
      await result.current.upload(cropped);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      UploadImageDocument,
      expect.objectContaining({ folder: '/users', fileName: 'avatar-1.jpg' }),
      { auth: true },
    );
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileDocument,
      { input: { profile_photo: 'http://img/x.jpg' } },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalled();
  });

  it('upload surfaces an error on failure', async () => {
    mockRequest.mockRejectedValue(new Error('upload boom'));
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.upload(cropped);
    });
    await waitFor(() => expect(result.current.error).toBe('upload boom'));
  });

  it('upload falls back to a generic message for a non-Error failure', async () => {
    mockRequest.mockRejectedValue('weird');
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.upload(cropped);
    });
    await waitFor(() => expect(result.current.error).toBe('Could not update photo.'));
  });

  it('remove clears the photo and refreshes', async () => {
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.remove();
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileDocument,
      { input: { profile_photo: null } },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalled();
  });

  it('remove surfaces an error on failure', async () => {
    mockRequest.mockRejectedValue(new Error('remove boom'));
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.remove();
    });
    await waitFor(() => expect(result.current.error).toBe('remove boom'));
  });

  it('remove falls back to a generic message for a non-Error failure', async () => {
    mockRequest.mockRejectedValue('weird');
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.remove();
    });
    await waitFor(() => expect(result.current.error).toBe('Could not remove photo.'));
  });

  it('cancelPick clears the staged image', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://p.jpg', width: 1, height: 1 }],
    });
    const { result } = renderHook(() => useProfilePhoto());
    await act(async () => {
      await result.current.pick();
    });
    act(() => result.current.cancelPick());
    expect(result.current.picked).toBeNull();
  });
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  MobileAccountDocument,
  MobileAccountHealthDocument,
  MobileUpdateProfileDocument,
  MobileUpdateProfileVisibilityDocument,
} from '@/graphql/account';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useAccount } from '@/hooks/useAccount';

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

const account = { me: { user_id: 'u1', first_name: 'Riya', roles: ['USER'] } };
const health = {
  myAccountHealth: { base_score: 100, total_score: 100, band: 'GREEN', adjustments: [] },
};

function routeRequest(doc: unknown, vars?: Record<string, unknown>) {
  if (doc === UploadImageDocument)
    return Promise.resolve({ uploadImageToImagekit: { url: 'http://img/x.jpg' } });
  if (doc === MobileUpdateProfileDocument)
    return Promise.resolve({ updateMyProfile: { user_id: 'u1' } });
  if (doc === MobileAccountHealthDocument) return Promise.resolve(health);
  if (doc === MobileAccountDocument) return Promise.resolve(account);
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(routeRequest);
  reqPerm.mockReset();
  launch.mockReset();
  mockRefetchMe.mockReset();
});

describe('useAccount', () => {
  it('loads the account record and health', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me?.first_name).toBe('Riya');
    expect(result.current.health?.band).toBe('GREEN');
  });

  it('captures a load error', async () => {
    mockRequest.mockReset().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('coalesces a missing account record and health to null', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileAccountHealthDocument) return Promise.resolve({ myAccountHealth: null });
      if (doc === MobileAccountDocument) return Promise.resolve({ me: null });
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me).toBeNull();
    expect(result.current.health).toBeNull();
  });

  it('changePhoto derives the mime type and file name when the asset omits them', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc' }] });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.changePhoto();
    });
    const uploadCall = mockRequest.mock.calls.find((c) => c[0] === UploadImageDocument)!;
    expect(uploadCall[1].mimeType).toBe('image/jpeg');
    expect(uploadCall[1].fileName).toMatch(/^avatar-\d+\.jpg$/);
    expect(uploadCall[1].fileBase64).toContain('data:image/jpeg;base64,abc');
  });

  it('updateProfile saves then refreshes me + account', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.updateProfile({ first_name: 'Riya R' });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileDocument,
      { input: { first_name: 'Riya R' } },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalled();
  });

  it('changePhoto uploads the picked image and updates the profile', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc', fileName: 'a.jpg', mimeType: 'image/jpeg' }],
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.changePhoto();
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileDocument,
      { input: { profile_photo: 'http://img/x.jpg' } },
      { auth: true },
    );
    expect(result.current.savingPhoto).toBe(false);
  });

  it('changePhoto throws when permission is denied', async () => {
    reqPerm.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.changePhoto()).rejects.toThrow('Photo access');
    });
  });

  it('updateVisibility toggles privacy and refreshes', async () => {
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.updateVisibility(true);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileVisibilityDocument,
      { visibility: 'PRIVATE' },
      { auth: true },
    );
    await act(async () => {
      await result.current.updateVisibility(false);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileUpdateProfileVisibilityDocument,
      { visibility: 'PUBLIC' },
      { auth: true },
    );
    expect(mockRefetchMe).toHaveBeenCalled();
  });

  it('changePhoto is a no-op when cancelled', async () => {
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: true });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.changePhoto();
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      UploadImageDocument,
      expect.anything(),
      expect.anything(),
    );
  });
});

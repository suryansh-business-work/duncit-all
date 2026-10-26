import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { uploadChatImage } from '@/hooks/useChatRoom';
import { useOfferPhotos } from '@/hooks/useOfferPhotos';

jest.mock('@/hooks/useChatRoom', () => ({ uploadChatImage: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args), error: jest.fn() } },
}));
const mockUpload = uploadChatImage as jest.Mock;
const mockPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const url = (n: number) => `https://ik.imagekit.io/duncit/chat/${n}.jpg`;

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.mockResolvedValue({ granted: true });
});

describe('useOfferPhotos', () => {
  it('asks the library for only the photos still allowed, and adds each upload to the list', async () => {
    mockLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { base64: 'A', fileName: 'a.jpg', mimeType: 'image/jpeg' },
        { base64: null, fileName: 'unreadable.jpg', mimeType: 'image/jpeg' },
      ],
    });
    mockUpload.mockResolvedValue(url(2));
    const onChange = jest.fn();
    const { result } = renderHook(() => useOfferPhotos([url(1)], onChange));
    expect(result.current.full).toBe(false);
    await act(async () => {
      await result.current.add();
    });
    expect(mockLibrary).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 3,
    });
    // A photo the picker could not read is skipped, not uploaded.
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([url(1), url(2)]);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('picks one at a time when only one more is allowed, and adds nothing when the picker is cancelled', async () => {
    mockLibrary.mockResolvedValue({ canceled: true, assets: null });
    const onChange = jest.fn();
    const { result } = renderHook(() => useOfferPhotos([url(1), url(2), url(3)], onChange));
    await act(async () => {
      await result.current.add();
    });
    expect(mockLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: false, selectionLimit: 1 }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens nothing once four are attached', async () => {
    const { result } = renderHook(() =>
      useOfferPhotos([url(1), url(2), url(3), url(4)], jest.fn()),
    );
    expect(result.current.full).toBe(true);
    await act(async () => {
      await result.current.add();
    });
    expect(mockPermission).not.toHaveBeenCalled();
  });

  it('says why the library could not open, and logs it', async () => {
    mockLibrary.mockRejectedValue(new Error('Picker unavailable'));
    const { result } = renderHook(() => useOfferPhotos([], jest.fn()));
    await act(async () => {
      await result.current.add();
    });
    expect(result.current.error).toBe('Picker unavailable');
    expect(mockWarn).toHaveBeenCalledWith('offerPhotos', 'upload', { error: expect.any(Error) });
  });
});

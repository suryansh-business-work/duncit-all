import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { logs } from '@duncit/logs';

import { useFoodFeedback } from '@/hooks/useFoodFeedback';
import { requestFoodFeedbackUploadPass, submitFoodFeedback } from '@/services/food-order';
import { postFileWithPass } from '@/services/imagekit-upload';
import { ApiError } from '@/utils/errors';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockT = (key: string) => key;
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: mockT }) }));
const mockTooLarge = jest.fn();
jest.mock('@/hooks/useUploadLimits', () => ({
  useUploadLimits: () => ({ tooLarge: mockTooLarge }),
}));
// The real form hook is covered by its own tests; here the values are seeded so a send can go out.
jest.mock('@/components/details/venue-food/food-feedback/useFoodFeedbackForm', () => ({
  useFoodFeedbackForm: () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports, react-hooks/rules-of-hooks
    require('react-hook-form').useForm({
      defaultValues: { rating: 4, comment: 'Lovely', images: [] },
    }),
}));
jest.mock('@/services/food-order', () => ({
  ...jest.requireActual('@/services/food-order'),
  requestFoodFeedbackUploadPass: jest.fn(),
  submitFoodFeedback: jest.fn(),
}));
jest.mock('@/services/imagekit-upload', () => ({ postFileWithPass: jest.fn() }));

const cameraPermission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const libraryPermission = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
const launchCamera = jest.mocked(ImagePicker.launchCameraAsync);
const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);
const passMock = jest.mocked(requestFoodFeedbackUploadPass);
const postMock = jest.mocked(postFileWithPass);
const submitMock = jest.mocked(submitFoodFeedback);

const granted = { granted: true } as ImagePicker.PermissionResponse;
const picked = (asset: Partial<ImagePicker.ImagePickerAsset> = {}) =>
  ({
    canceled: false,
    assets: [
      { uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/png', fileSize: 10, ...asset },
    ],
  }) as ImagePicker.ImagePickerResult;

const onDone = jest.fn();
const setup = () => renderHook(() => useFoodFeedback({ orderId: 'o1', accessKey: 'key', onDone }));

beforeEach(() => {
  jest.clearAllMocks();
  cameraPermission.mockResolvedValue(granted);
  libraryPermission.mockResolvedValue(granted);
  launchCamera.mockResolvedValue(picked());
  launchLibrary.mockResolvedValue(picked());
  mockTooLarge.mockReturnValue(null);
  passMock.mockResolvedValue({ ticket: 'pass' } as never);
  postMock.mockResolvedValue('https://cdn/a.jpg');
});

describe('useFoodFeedback — adding a photo', () => {
  it('uploads a library pick with the order pass and keeps its url', async () => {
    const { result } = setup();
    await act(async () => result.current.addPhoto('library'));
    expect(libraryPermission).toHaveBeenCalled();
    expect(launchLibrary).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 0.8 });
    expect(mockTooLarge).toHaveBeenCalledWith({ name: 'a.jpg', mimeType: 'image/png', size: 10 });
    expect(passMock).toHaveBeenCalledWith('o1', 'key');
    expect(postMock).toHaveBeenCalledWith(
      { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/png' },
      { ticket: 'pass' },
    );
    expect(result.current.uploading).toBe(false);
    expect(result.current.photoError).toBeNull();
  });

  it('uses the camera for a camera pick and names an unnamed photo', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700);
    launchCamera.mockResolvedValue(picked({ fileName: null, mimeType: undefined }));
    const { result } = setup();
    await act(async () => result.current.addPhoto('camera'));
    expect(cameraPermission).toHaveBeenCalled();
    expect(launchLibrary).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith(
      { uri: 'file:///a.jpg', name: 'food-feedback.1700.jpg', type: 'image/jpeg' },
      { ticket: 'pass' },
    );
    jest.spyOn(Date, 'now').mockRestore();
  });

  it.each([
    ['camera', 'mweb.venueFood.feedback.cameraPermissionNeeded'],
    ['library', 'mweb.chatRoom.photoAccessIsNeededToSend'],
  ] as const)('says so when the %s permission is refused', async (from, message) => {
    cameraPermission.mockResolvedValue({ granted: false } as ImagePicker.PermissionResponse);
    libraryPermission.mockResolvedValue({ granted: false } as ImagePicker.PermissionResponse);
    const { result } = setup();
    await act(async () => result.current.addPhoto(from));
    expect(result.current.photoError).toBe(message);
    expect(launchCamera).not.toHaveBeenCalled();
    expect(launchLibrary).not.toHaveBeenCalled();
  });

  it('reports a picker that throws, and logs it', async () => {
    const failure = new Error('no camera');
    launchCamera.mockRejectedValue(failure);
    const { result } = setup();
    await act(async () => result.current.addPhoto('camera'));
    expect(result.current.photoError).toBe('mweb.venueFood.feedback.uploadFailed');
    expect(logs.mobileApp.error).toHaveBeenCalledWith('venueFood', 'pickFeedbackPhoto', {
      error: failure,
      orderId: 'o1',
      from: 'camera',
    });
  });

  it('does nothing when the picker is cancelled or returns no asset', async () => {
    const { result } = setup();
    launchLibrary.mockResolvedValueOnce({ canceled: true, assets: null });
    await act(async () => result.current.addPhoto('library'));
    launchLibrary.mockResolvedValueOnce({ canceled: false, assets: [] });
    await act(async () => result.current.addPhoto('library'));
    expect(passMock).not.toHaveBeenCalled();
    expect(result.current.photoError).toBeNull();
  });

  it('shows the size sentence and uploads nothing for a file over the cap', async () => {
    mockTooLarge.mockReturnValue('too big');
    const { result } = setup();
    await act(async () => result.current.addPhoto('library'));
    expect(result.current.photoError).toBe('too big');
    expect(passMock).not.toHaveBeenCalled();
  });

  it('reports a failed upload, logs it and clears the uploading flag', async () => {
    const failure = new Error('403');
    postMock.mockRejectedValue(failure);
    const { result } = setup();
    await act(async () => result.current.addPhoto('library'));
    expect(result.current.photoError).toBe('mweb.venueFood.feedback.uploadFailed');
    expect(result.current.uploading).toBe(false);
    expect(logs.mobileApp.error).toHaveBeenCalledWith('venueFood', 'uploadFeedbackPhoto', {
      error: failure,
      orderId: 'o1',
    });
  });

  it('clears an earlier photo error when the next pick starts', async () => {
    mockTooLarge.mockReturnValueOnce('too big');
    const { result } = setup();
    await act(async () => result.current.addPhoto('library'));
    expect(result.current.photoError).toBe('too big');
    await act(async () => result.current.addPhoto('library'));
    expect(result.current.photoError).toBeNull();
  });

  it('ignores a second pick while one is uploading', async () => {
    let finish: (url: string) => void = () => undefined;
    postMock.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { result } = setup();
    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.addPhoto('library');
    });
    expect(result.current.uploading).toBe(true);
    await act(async () => result.current.addPhoto('library'));
    expect(libraryPermission).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish('https://cdn/a.jpg');
      await first;
    });
    expect(result.current.uploading).toBe(false);
  });

  it('stops at the photo limit and lets a photo be removed again', async () => {
    postMock
      .mockResolvedValueOnce('u1')
      .mockResolvedValueOnce('u2')
      .mockResolvedValueOnce('u3')
      .mockResolvedValueOnce('u4');
    const { result } = setup();
    for (let i = 0; i < 3; i += 1) {
      await act(async () => result.current.addPhoto('library'));
    }
    await act(async () => result.current.addPhoto('library'));
    expect(libraryPermission).toHaveBeenCalledTimes(3);
    act(() => result.current.removePhoto('u2'));
    await act(async () => result.current.addPhoto('library'));
    expect(libraryPermission).toHaveBeenCalledTimes(4);
    await act(async () => result.current.submit());
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({ images: ['u1', 'u3', 'u4'] }),
    );
  });
});

describe('useFoodFeedback — sending', () => {
  it('sends the rating with the order key and tells the screen it went in', async () => {
    submitMock.mockResolvedValue(undefined as never);
    const { result } = setup();
    await act(async () => result.current.submit());
    expect(submitMock).toHaveBeenCalledWith({
      order_id: 'o1',
      access_key: 'key',
      rating: 4,
      comment: 'Lovely',
      images: [],
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it('says it failed, stays on the form and logs when the send is refused', async () => {
    const failure = new ApiError('boom', 500, { code: 'INTERNAL' });
    submitMock.mockRejectedValue(failure);
    const { result } = setup();
    await act(async () => result.current.submit());
    expect(result.current.error).toBe('mweb.venueFood.feedback.submitFailed');
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
    expect(logs.mobileApp.error).toHaveBeenCalledWith('venueFood', 'submitFeedback', {
      error: failure,
      orderId: 'o1',
    });
  });

  it('treats a second rating as already rated and has the order read again', async () => {
    submitMock.mockRejectedValue(new ApiError('dup', 409, { code: 'CONFLICT' }));
    const { result } = setup();
    await act(async () => result.current.submit());
    expect(result.current.error).toBe('mweb.venueFood.feedback.alreadyRated');
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

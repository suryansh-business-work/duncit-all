import { renderHook } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { ChallengeMediaType } from '@duncit/utils';

import { useEntryPicker } from '@/hooks/useEntryPicker';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockT = (key: string) => key;
jest.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: mockT }) }));
const mockTooLarge = jest.fn();
jest.mock('@/hooks/useUploadLimits', () => ({
  useUploadLimits: () => ({ tooLarge: mockTooLarge }),
}));

const permission = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const pickDocument = jest.mocked(DocumentPicker.getDocumentAsync);

const library = (accepted: ChallengeMediaType[]) => {
  const fn = renderHook(() => useEntryPicker(accepted)).result.current.fromLibrary;
  if (!fn) throw new Error('library not offered');
  return fn;
};
const files = (accepted: ChallengeMediaType[]) => {
  const fn = renderHook(() => useEntryPicker(accepted)).result.current.fromFiles;
  if (!fn) throw new Error('files not offered');
  return fn;
};
const asset = (patch: Record<string, unknown> = {}) =>
  ({
    canceled: false,
    assets: [
      {
        uri: 'file:///a',
        fileName: 'a.jpg',
        mimeType: 'image/jpeg',
        fileSize: 5,
        type: 'image',
        ...patch,
      },
    ],
  }) as ImagePicker.ImagePickerResult;

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue({ granted: true } as ImagePicker.PermissionResponse);
  mockTooLarge.mockReturnValue(null);
});

describe('useEntryPicker — what is offered', () => {
  it.each([
    [['IMAGE'], true, false],
    [['VIDEO'], true, false],
    [['AUDIO'], false, true],
    [['IMAGE', 'AUDIO'], true, true],
    [[], false, false],
  ] as const)('for %j: library=%s files=%s', (accepted, hasLibrary, hasFiles) => {
    const { result } = renderHook(() => useEntryPicker([...accepted]));
    expect(result.current.fromLibrary !== null).toBe(hasLibrary);
    expect(result.current.fromFiles !== null).toBe(hasFiles);
  });
});

describe('useEntryPicker — library', () => {
  it('asks only for the media kinds the tool accepts', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    await library(['IMAGE', 'AUDIO'])();
    expect(launch).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 0.8 });
    await library(['VIDEO', 'IMAGE'])();
    expect(launch).toHaveBeenLastCalledWith({ mediaTypes: ['images', 'videos'], quality: 0.8 });
  });

  it('refuses without photo access and never opens the library', async () => {
    permission.mockResolvedValue({ granted: false } as ImagePicker.PermissionResponse);
    expect(await library(['IMAGE'])()).toEqual({
      error: 'mweb.challenge.tools.errors.photoAccess',
    });
    expect(launch).not.toHaveBeenCalled();
  });

  it('answers null when the pick is cancelled or empty', async () => {
    launch.mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await library(['IMAGE'])()).toBeNull();
    launch.mockResolvedValueOnce({ canceled: false, assets: [] });
    expect(await library(['IMAGE'])()).toBeNull();
  });

  it('answers the file for an accepted image and checks its size', async () => {
    launch.mockResolvedValue(asset());
    expect(await library(['IMAGE'])()).toEqual({
      file: { uri: 'file:///a', name: 'a.jpg', type: 'image/jpeg' },
    });
    expect(mockTooLarge).toHaveBeenCalledWith({ name: 'a.jpg', mimeType: 'image/jpeg', size: 5 });
  });

  it('names an unnamed photo and an unnamed video, and types them', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(99);
    launch.mockResolvedValueOnce(asset({ fileName: null, mimeType: null }));
    expect(await library(['IMAGE'])()).toEqual({
      file: { uri: 'file:///a', name: 'entry.99.jpg', type: 'image/jpeg' },
    });
    launch.mockResolvedValueOnce(asset({ fileName: null, mimeType: null, type: 'video' }));
    expect(await library(['VIDEO'])()).toEqual({
      file: { uri: 'file:///a', name: 'entry.99.mp4', type: 'video/mp4' },
    });
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('refuses a kind the tool does not take', async () => {
    launch.mockResolvedValue(asset({ mimeType: 'video/mp4', type: 'video' }));
    expect(await library(['IMAGE'])()).toEqual({ error: 'mweb.challenge.tools.errors.fileType' });
    expect(mockTooLarge).not.toHaveBeenCalled();
  });

  it('refuses a file of no known kind', async () => {
    launch.mockResolvedValue(asset({ mimeType: 'application/pdf' }));
    expect(await library(['IMAGE'])()).toEqual({ error: 'mweb.challenge.tools.errors.fileType' });
  });

  it('answers the size sentence for a file over its cap', async () => {
    mockTooLarge.mockReturnValue('over the cap');
    launch.mockResolvedValue(asset());
    expect(await library(['IMAGE'])()).toEqual({ error: 'over the cap' });
  });
});

describe('useEntryPicker — files', () => {
  it('opens the files app for audio, cached', async () => {
    pickDocument.mockResolvedValue({ canceled: true, assets: null });
    await files(['AUDIO'])();
    expect(pickDocument).toHaveBeenCalledWith({ type: 'audio/*', copyToCacheDirectory: true });
  });

  it('answers null when cancelled or empty', async () => {
    pickDocument.mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await files(['AUDIO'])()).toBeNull();
    pickDocument.mockResolvedValueOnce({ canceled: false, assets: [] });
    expect(await files(['AUDIO'])()).toBeNull();
  });

  it('answers the picked audio file with its size checked', async () => {
    pickDocument.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///s.m4a', name: 's.m4a', mimeType: 'audio/mp4', size: 7, lastModified: 0 },
      ],
    });
    expect(await files(['AUDIO'])()).toEqual({
      file: { uri: 'file:///s.m4a', name: 's.m4a', type: 'audio/mp4' },
    });
    expect(mockTooLarge).toHaveBeenCalledWith({ name: 's.m4a', mimeType: 'audio/mp4', size: 7 });
  });

  it('assumes mp3 when the picker gives no mime type', async () => {
    pickDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///s', name: 's', size: 7, lastModified: 0 }],
    });
    expect(await files(['AUDIO'])()).toEqual({
      file: { uri: 'file:///s', name: 's', type: 'audio/mpeg' },
    });
  });
});

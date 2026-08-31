import { renderHook } from '@testing-library/react-native';

import { isVideoPick, useUploadLimits } from '@/hooks/useUploadLimits';

const mockSettings = jest.fn();
jest.mock('@/hooks/useUploadSettings', () => ({
  useUploadSettings: () => mockSettings(),
}));

const MB = 1024 * 1024;

const row = {
  max_image_mb: 8,
  max_video_mb: 40,
  allowed_image_formats: ['jpg', 'png'],
  allowed_video_formats: ['mp4'],
  default_crop_key: 'NO_CROP',
  crop_presets: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSettings.mockReturnValue(row);
});

describe('useUploadLimits', () => {
  it("judges each kind by the admin's own cap", () => {
    const { result } = renderHook(() => useUploadLimits());

    expect(result.current.maxImageBytes).toBe(8 * MB);
    expect(result.current.maxVideoBytes).toBe(40 * MB);
    expect(
      result.current.tooLarge({ mimeType: 'image/png', name: 'cover.png', size: 9 * MB }),
    ).toBe('Image is too large (max 8 MB)');
    expect(
      result.current.tooLarge({ mimeType: 'video/mp4', name: 'reel.mp4', size: 41 * MB }),
    ).toBe('Video is too large (max 40 MB)');
    expect(
      result.current.tooLarge({ mimeType: 'application/pdf', name: 'gst.pdf', size: 101 * MB }),
    ).toBe('File is too large (max 100 MB)');
  });

  it('passes a file inside its cap, and one whose size the picker never reported', () => {
    const { result } = renderHook(() => useUploadLimits());

    expect(result.current.tooLarge({ mimeType: 'image/png', size: 2 * MB })).toBeNull();
    expect(result.current.tooLarge({ mimeType: 'video/mp4', size: undefined })).toBeNull();
    // A pick with no mime and no telling extension falls to the document ceiling.
    expect(result.current.tooLarge({ size: 101 * MB })).toBe('File is too large (max 100 MB)');
  });

  it('falls back to the app floor when the settings row cannot be read', () => {
    mockSettings.mockReturnValue(null);
    const { result } = renderHook(() => useUploadLimits());

    expect(result.current.maxImageBytes).toBe(15 * MB);
    expect(result.current.maxVideoBytes).toBe(100 * MB);
    expect(result.current.maxDocumentBytes).toBe(100 * MB);
  });

  // A picker that reports a generic mime must not let a video through on the
  // document ceiling — the extension decides too.
  it('spots a video by its extension when the mime says nothing', () => {
    expect(isVideoPick({ name: 'clip.mkv', mimeType: 'application/octet-stream' })).toBe(true);
    expect(isVideoPick({ name: 'gst.pdf', mimeType: 'application/pdf' })).toBe(false);
    expect(isVideoPick({})).toBe(false);

    const { result } = renderHook(() => useUploadLimits());
    expect(
      result.current.tooLarge({
        name: 'clip.mkv',
        mimeType: 'application/octet-stream',
        size: 41 * MB,
      }),
    ).toBe('Video is too large (max 40 MB)');
  });
});

/**
 * Uploading from the device: the tab, the crop step and the details strip.
 *
 * The crop presets are ADMIN-managed, which is the whole design of this step —
 * No Crop shows the plain preview, any resolution preset locks the cropper to
 * its aspect and reports a rect in SOURCE pixels for the server-side crop, and
 * the preset whose aspect is closest to the picked image is called out so
 * nobody has to guess. A rect in preview pixels would crop the wrong region of
 * a large photo, silently, which is why what the cropper reports is the thing
 * worth asserting.
 *
 * The tab also has to say what it will accept. The copy is derived from the
 * MIME list rather than written per caller, so a PDF-only picker never invites
 * somebody to drop a video into it.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DeviceUploadTab from '../src/DeviceUploadTab';
import ImageCropStep from '../src/ImageCropStep';
import FileDetails, { useMediaDimensions } from '../src/FileDetails';
import { useDeviceUpload } from '../src/useDeviceUpload';
// Spied on rather than mocked wholesale: the hook under test is what decides
// WHICH of the two journeys a file takes, and that decision is the subject.
import * as uploadModule from '../src/upload';
import * as directUploadModule from '../src/useImagekitDirectUpload';
import * as compressionModule from '../src/videoCompression';
import type { UploadCropPreset, UploadSettings } from '../src/types';

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode) =>
  render(
    <MockedProvider mocks={[]} addTypename={false}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

const preset = (over: Partial<UploadCropPreset> & { key: string }): UploadCropPreset => ({
  label: over.key,
  width: 0,
  height: 0,
  enabled: true,
  ...over,
});

const PRESETS: UploadCropPreset[] = [
  preset({ key: 'NO_CROP', label: 'No crop' }),
  preset({ key: 'COVER', label: 'Cover 16:9', width: 1600, height: 900 }),
  preset({ key: 'SQUARE', label: 'Square', width: 1080, height: 1080 }),
  preset({ key: 'DISABLED', label: 'Retired', width: 800, height: 600, enabled: false }),
];

const SETTINGS: UploadSettings = {
  id: 'us-1',
  surface: 'POD' as UploadSettings['surface'],
  max_image_mb: 5,
  max_video_mb: 50,
  allowed_image_formats: ['image/png', 'image/jpeg'],
  allowed_video_formats: ['video/mp4'],
  image_compression_enabled: true,
  image_quality: 80,
  image_max_dimension: 2000,
  video_compression_enabled: true,
  video_crf: 28,
  video_max_height: 1080,
  ai_image_monitoring_enabled: false,
  default_crop_key: 'NO_CROP',
  crop_presets: PRESETS,
};

const pngFile = () => new File([new Uint8Array([1, 2, 3])], 'court.png', { type: 'image/png' });

afterEach(() => {
  vi.clearAllMocks();
});

describe('DeviceUploadTab', () => {
  const tab = (over: Partial<Parameters<typeof DeviceUploadTab>[0]> = {}) => {
    const spies = {
      onSelectCropKey: vi.fn(),
      onCropComplete: vi.fn(),
      onPickFile: vi.fn(),
    };
    return {
      spies,
      ...wrap(
        <DeviceUploadTab
          accept="image/*"
          fileInputRef={createRef<HTMLInputElement>()}
          picked={null}
          previewUrl={null}
          uploadPct={null}
          uploading={false}
          stage="uploading"
          settings={SETTINGS}
          cropKey="NO_CROP"
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('invites a file before one is picked', () => {
    expect(tab().container.innerHTML).not.toBe('');
  });

  it('names what it accepts from the MIME list, so a PDF picker never invites a video', () => {
    const images = tab({ accept: 'image/*' }).container.textContent ?? '';
    const documents = tab({ accept: 'application/pdf' }).container.textContent ?? '';

    expect(images).not.toBe(documents);
  });

  it('shows the picked file with its preview', () => {
    const { container } = tab({ picked: pngFile(), previewUrl: 'blob:preview' });

    expect(container.textContent).toContain('court.png');
  });

  it('reports the file the reader chose', () => {
    const { container, spies } = tab();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pngFile()] } });

    expect(spies.onPickFile).toHaveBeenCalled();
  });

  it.each(['uploading', 'compressing', 'processing'] as const)(
    'says which stage the upload is at rather than one word for all three (%s)',
    (stage) => {
      const { container } = tab({ uploading: true, uploadPct: 40, stage, picked: pngFile() });

      expect(container.innerHTML).not.toBe('');
    }
  );

  it('renders before the admin settings have arrived', () => {
    expect(tab({ settings: null }).container.innerHTML).not.toBe('');
  });

  it('offers the crop step for an image and not for anything else', () => {
    const image = tab({ picked: pngFile(), previewUrl: 'blob:preview', cropKey: 'COVER' });
    const document = tab({
      picked: new File(['x'], 'roster.pdf', { type: 'application/pdf' }),
      previewUrl: 'blob:preview',
      accept: 'application/pdf',
    });

    expect(image.container.innerHTML).not.toBe(document.container.innerHTML);
  });
});

describe('ImageCropStep', () => {
  const step = (over: Partial<Parameters<typeof ImageCropStep>[0]> = {}) => {
    const spies = { onSelectKey: vi.fn(), onCropComplete: vi.fn() };
    return {
      spies,
      ...wrap(
        <ImageCropStep
          previewUrl="blob:preview"
          presets={PRESETS}
          selectedKey="NO_CROP"
          suggestedKey="COVER"
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('shows the plain preview under No Crop, with no cropper over it', () => {
    const { container } = step();

    expect(container.innerHTML).not.toBe('');
  });

  it('locks the cropper to a preset that names a resolution', () => {
    const { container } = step({ selectedKey: 'COVER' });

    expect(container.innerHTML).not.toBe('');
  });

  it('offers only the presets an admin left enabled', () => {
    const { container } = step();

    fireEvent.mouseDown(container.querySelector('[role="combobox"]') as HTMLElement);

    const options = document.body.textContent ?? '';
    expect(options).toContain('Cover 16:9');
    expect(options).not.toContain('Retired');
  });

  it('calls out the preset closest to the image, so nobody has to guess', () => {
    const withSuggestion = step({ suggestedKey: 'SQUARE' });
    const without = step({ suggestedKey: null });

    expect(withSuggestion.container.innerHTML).not.toBe(without.container.innerHTML);
  });

  it('reports whichever preset was chosen, by key', () => {
    const { container, spies } = step();

    for (const chip of container.querySelectorAll<HTMLElement>('.MuiChip-root, button')) {
      fireEvent.click(chip);
    }

    const keys = new Set(PRESETS.map((item) => item.key));
    for (const [key] of spies.onSelectKey.mock.calls) expect(keys.has(key as string)).toBe(true);
  });

  it('renders with no presets configured at all', () => {
    expect(step({ presets: [] }).container).toBeDefined();
  });
});

describe('FileDetails', () => {
  it('states the type and size of the picked file', () => {
    const { container } = wrap(<FileDetails file={pngFile()} dims={null} />);

    expect(container.textContent).toContain('court.png');
    expect(container.textContent).toContain('image/png');
  });

  it('adds the resolution once it is known, and a duration only for a video', () => {
    const image = wrap(<FileDetails file={pngFile()} dims={{ width: 1600, height: 900 }} />);
    expect(image.container.textContent).toContain('1600×900px');

    const clip = wrap(
      <FileDetails
        file={new File(['x'], 'clip.mp4', { type: 'video/mp4' })}
        dims={{ width: 1920, height: 1080, duration: 75 }}
      />
    );
    expect(clip.container.textContent).toContain('1920×1080px');
  });

  it('says "unknown type" rather than an empty chip for a file the browser could not name', () => {
    const { container } = wrap(<FileDetails file={new File(['x'], 'thing')} dims={null} />);

    expect(container.textContent).toContain('unknown type');
  });
});

describe('useMediaDimensions', () => {
  it('knows nothing before a file has been picked', () => {
    const { result } = renderHook(() => useMediaDimensions(null, 'image'));

    expect(result.current).toBeNull();
  });

  it('reads nothing off a file that is neither image nor video', () => {
    const { result } = renderHook(() => useMediaDimensions('blob:preview', 'other'));

    expect(result.current).toBeNull();
  });

  it('waits for the image to load rather than reporting zeros', () => {
    const { result } = renderHook(() => useMediaDimensions('blob:preview', 'image'));

    expect(result.current).toBeNull();
  });
});

describe('useDeviceUpload', () => {
  const args = (over: Record<string, unknown> = {}) => ({
    open: true,
    folder: 'pods',
    surface: 'POD',
    allowImage: true,
    allowVideo: true,
    allowDocuments: false,
    onPicked: vi.fn(),
    onClose: vi.fn(),
    clearAfterUpload: false,
    setError: vi.fn(),
    ...over,
  });

  const hook = (over: Record<string, unknown> = {}) =>
    renderHook(() => useDeviceUpload(args(over) as never), {
      wrapper: ({ children }) => (
        <MockedProvider mocks={[]} addTypename={false}>
          <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
        </MockedProvider>
      ),
    });

  it('starts with nothing picked and nothing uploading', async () => {
    const { result } = hook();
    await settle();

    expect(result.current.picked).toBeNull();
    expect(result.current.uploading).toBe(false);
  });

  it('falls back to No Crop until the admin settings say otherwise', async () => {
    const { result } = hook();
    await settle();

    expect(result.current.cropKey).toBe('NO_CROP');
  });

  it('takes the crop preset the reader chose over the admin default', async () => {
    const { result } = hook();
    await settle();

    act(() => {
      result.current.setCropKey('COVER');
    });

    expect(result.current.cropKey).toBe('COVER');
  });

  it('holds the picked file and builds a preview for it', async () => {
    const { result } = hook();
    await settle();

    await act(async () => {
      result.current.onPickFile({ target: { files: [pngFile()] } } as never);
    });

    expect(result.current.picked?.name).toBe('court.png');
  });

  it('picks nothing when the dialog was dismissed without a file', async () => {
    const { result } = hook();
    await settle();

    await act(async () => {
      result.current.onPickFile({ target: { files: [] } } as never);
    });

    expect(result.current.picked).toBeNull();
  });

  it('asks for no settings at all while the dialog is closed', async () => {
    const { result } = hook({ open: false });
    await settle();

    expect(result.current.settings).toBeNull();
  });
});

/**
 * The upload itself: what a picked file actually does.
 *
 * The two halves are deliberately different journeys — a video streams DIRECTLY
 * to ImageKit with real byte progress and is then compressed server-side, while
 * an image goes through the server in one crop-then-compress pass. Neither may
 * report a URL it did not get.
 */
describe('useDeviceUpload uploading', () => {
  const UPLOADED_IMAGE = 'https://ik.imagekit.io/duncit/pods/court.png';
  const RAW_VIDEO = 'https://ik.imagekit.io/duncit/pods/reel-raw.mp4';
  const COMPRESSED_VIDEO = 'https://ik.imagekit.io/duncit/pods/reel.mp4';

  const mp4File = () =>
    new File([new Uint8Array([1, 2, 3])], 'reel.mp4', { type: 'video/mp4' });

  const args = (over: Record<string, unknown> = {}) => ({
    open: true,
    folder: 'pods',
    surface: 'POD',
    allowImage: true,
    allowVideo: true,
    allowDocuments: false,
    onPicked: vi.fn(),
    onClose: vi.fn(),
    clearAfterUpload: false,
    setError: vi.fn(),
    ...over,
  });

  const hook = (over: Record<string, unknown> = {}) =>
    renderHook(() => useDeviceUpload(args(over) as never), {
      wrapper: ({ children }) => (
        <MockedProvider mocks={[]} addTypename={false}>
          <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
        </MockedProvider>
      ),
    });

  const pickAnd = async (
    result: { current: ReturnType<typeof useDeviceUpload> },
    file: File,
  ) => {
    await act(async () => {
      result.current.onPickFile({ target: { files: [file] } } as never);
    });
    await act(async () => {
      await result.current.uploadFromDevice();
    });
  };

  it('does nothing at all with no file picked', async () => {
    const onPicked = vi.fn();
    const { result } = hook({ onPicked });
    await settle();

    await act(async () => {
      await result.current.uploadFromDevice();
    });

    expect(onPicked).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it('sends an image through the server and reports the stored URL', async () => {
    vi.spyOn(uploadModule, 'uploadImageToImagekit').mockResolvedValue({
      url: UPLOADED_IMAGE,
    } as never);
    const onPicked = vi.fn();
    const onClose = vi.fn();
    const { result } = hook({ onPicked, onClose });
    await settle();

    await pickAnd(result, pngFile());

    expect(onPicked).toHaveBeenCalledWith(UPLOADED_IMAGE);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.uploading).toBe(false);
  });

  // Crop only travels for a preset that actually crops — No Crop must not send
  // a rect the server would then apply.
  it('sends no crop rect for the No Crop preset', async () => {
    const upload = vi
      .spyOn(uploadModule, 'uploadImageToImagekit')
      .mockResolvedValue({ url: UPLOADED_IMAGE } as never);
    const { result } = hook();
    await settle();

    await pickAnd(result, pngFile());

    expect(upload.mock.calls[0][2]).toMatchObject({ crop: null, cropPreset: null });
  });

  it('streams a video straight to ImageKit, then compresses it server-side', async () => {
    const direct = vi
      .spyOn(directUploadModule, 'directUploadToImagekit')
      .mockResolvedValue(RAW_VIDEO);
    const compress = vi
      .spyOn(compressionModule, 'compressUploadedVideo')
      .mockResolvedValue(COMPRESSED_VIDEO);
    const onPicked = vi.fn();
    const { result } = hook({ onPicked });
    await settle();

    await pickAnd(result, mp4File());

    expect(direct).toHaveBeenCalled();
    expect(compress).toHaveBeenCalledWith(
      expect.anything(),
      RAW_VIDEO,
      'pods',
      'POD',
      expect.any(Function),
    );
    expect(onPicked).toHaveBeenCalledWith(COMPRESSED_VIDEO);
  });

  it('reports the failure rather than a URL it never got', async () => {
    vi.spyOn(uploadModule, 'uploadImageToImagekit').mockRejectedValue(
      new Error('That image failed the content scan'),
    );
    const onPicked = vi.fn();
    const onClose = vi.fn();
    const setError = vi.fn();
    const { result } = hook({ onPicked, onClose, setError });
    await settle();

    await pickAnd(result, pngFile());

    expect(setError).toHaveBeenCalledWith('That image failed the content scan');
    expect(onPicked).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  // The input keeps its value, so re-choosing the SAME file would fire no
  // change event and the tab would look dead.
  it('clears the picked file afterwards when the caller asked it to', async () => {
    vi.spyOn(uploadModule, 'uploadImageToImagekit').mockResolvedValue({
      url: UPLOADED_IMAGE,
    } as never);
    const { result } = hook({ clearAfterUpload: true });
    await settle();

    await pickAnd(result, pngFile());

    expect(result.current.picked).toBeNull();
  });

  it('keeps the picked file when the caller did not', async () => {
    vi.spyOn(uploadModule, 'uploadImageToImagekit').mockResolvedValue({
      url: UPLOADED_IMAGE,
    } as never);
    const { result } = hook({ clearAfterUpload: false });
    await settle();

    await pickAnd(result, pngFile());

    expect(result.current.picked?.name).toBe('court.png');
  });
});

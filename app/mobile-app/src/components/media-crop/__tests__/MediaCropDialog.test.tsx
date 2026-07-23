import { fireEvent, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import {
  MediaCropDialog,
  initialKey,
  optionsFor,
  type CropResult,
  type PickedMedia,
} from '@/components/media-crop/MediaCropDialog';
import type { MobileUploadSettings } from '@/hooks/useUploadSettings';
import { renderWithProviders } from '@/utils/test-utils';

const PRESETS = [
  { key: 'RATIO_16_9', label: '16:9', width: 1920, height: 1080, enabled: true },
  { key: 'VERTICAL_9_16', label: 'Vertical', width: 1080, height: 1920, enabled: true },
  { key: 'POD_MOMENT', label: 'Moment', width: 1080, height: 1080, enabled: true },
];

const settings = (over: Partial<MobileUploadSettings> = {}): MobileUploadSettings => ({
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: ['jpg'],
  allowed_video_formats: ['mp4'],
  default_crop_key: 'NO_CROP',
  crop_presets: PRESETS,
  ...over,
});

const imageMedia: PickedMedia = {
  uri: 'file://p.jpg',
  base64: 'abc',
  fileName: 'p.jpg',
  mimeType: 'image/jpeg',
  fileSize: 2048,
  width: 1920,
  height: 1080,
  kind: 'image',
};

const videoMedia: PickedMedia = {
  uri: 'file://v.mp4',
  fileName: 'v.mp4',
  mimeType: 'video/mp4',
  fileSize: 4096,
  width: 1280,
  height: 720,
  kind: 'video',
  durationMs: 12_000,
};

function render(over: Partial<ComponentProps<typeof MediaCropDialog>> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  renderWithProviders(
    <MediaCropDialog
      media={imageMedia}
      settings={settings()}
      uploading={false}
      stage="processing"
      progress={null}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...over}
    />,
  );
  return { onConfirm, onCancel };
}

describe('optionsFor / initialKey', () => {
  it('prepends No Crop to the croppable presets', () => {
    expect(optionsFor(PRESETS).map((o) => o.key)).toEqual([
      'NO_CROP',
      'RATIO_16_9',
      'VERTICAL_9_16',
      'POD_MOMENT',
    ]);
  });

  it('prefers the suggested key, then the default, then falls back to No Crop', () => {
    const options = optionsFor(PRESETS);
    expect(initialKey(options, 'VERTICAL_9_16', 'NO_CROP')).toBe('VERTICAL_9_16');
    expect(initialKey(options, null, 'POD_MOMENT')).toBe('POD_MOMENT');
    expect(initialKey(options, null, 'NONEXISTENT')).toBe('NO_CROP');
  });
});

describe('MediaCropDialog', () => {
  it('renders nothing without media', () => {
    render({ media: null });
    expect(screen.queryByTestId('media-crop-dialog')).toBeNull();
  });

  it('shows the crop UI, suggested preset, file details, and confirms with a crop rect', () => {
    const { onConfirm } = render();
    expect(screen.getByText('Crop & upload')).toBeOnTheScreen();
    expect(screen.getByTestId('crop-image-preview')).toBeOnTheScreen();
    expect(screen.getByTestId('file-details')).toBeOnTheScreen();
    // 16:9 source → RATIO_16_9 suggested + preselected → its output size is shown.
    expect(screen.getByTestId('crop-suggested-size')).toHaveTextContent('Output 1920×1080px');
    expect(screen.getByText('16:9 · Suggested')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('crop-zoom-in'));
    fireEvent.press(screen.getByTestId('crop-zoom-out'));
    fireEvent.press(screen.getByTestId('crop-confirm'));
    const result = onConfirm.mock.calls[0]?.[0] as CropResult;
    expect(result.cropPresetKey).toBe('RATIO_16_9');
    expect(result.cropRect?.width).toBeGreaterThan(0);
  });

  it('drops the crop when No Crop is selected', () => {
    const { onConfirm } = render();
    fireEvent.press(screen.getByTestId('crop-preset-NO_CROP'));
    expect(screen.queryByTestId('crop-suggested-size')).toBeNull();
    expect(screen.queryByTestId('crop-zoom-in')).toBeNull();
    fireEvent.press(screen.getByTestId('crop-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({ cropRect: null, cropPresetKey: 'NO_CROP' });
  });

  it('shows a video preview + Upload label and confirms without a crop', () => {
    const { onConfirm } = render({
      media: videoMedia,
      settings: settings({ default_crop_key: 'NONEXISTENT' }),
    });
    expect(screen.getByText('Upload video')).toBeOnTheScreen();
    expect(screen.getByTestId('crop-video-preview')).toBeOnTheScreen();
    expect(screen.queryByTestId('crop-preset-NO_CROP')).toBeNull();
    fireEvent.press(screen.getByTestId('crop-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({ cropRect: null, cropPresetKey: 'NO_CROP' });
  });

  it('offers only No Crop when settings (and presets) are unavailable', () => {
    render({ settings: null });
    expect(screen.getByTestId('crop-preset-NO_CROP')).toBeOnTheScreen();
    expect(screen.queryByTestId('crop-preset-RATIO_16_9')).toBeNull();
    expect(screen.queryByTestId('crop-suggested-size')).toBeNull();
  });

  it('shows an indeterminate spinner while an image uploads and inerts the controls', () => {
    const { onConfirm, onCancel } = render({
      uploading: true,
      stage: 'processing',
      progress: null,
    });
    expect(screen.getByTestId('crop-progress')).toBeOnTheScreen();
    expect(screen.getByText('Cropping & compressing…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('crop-confirm'));
    fireEvent.press(screen.getByTestId('crop-close'));
    fireEvent.press(screen.getByTestId('crop-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows a determinate percentage while a video uploads', () => {
    render({ media: videoMedia, uploading: true, stage: 'uploading', progress: 40 });
    expect(screen.getByText('Uploading… 40%')).toBeOnTheScreen();
  });

  it('surfaces an error and cancels via the close and cancel buttons', () => {
    const { onCancel } = render({ error: 'Upload failed' });
    expect(screen.getByTestId('crop-error')).toHaveTextContent('Upload failed');
    fireEvent.press(screen.getByTestId('crop-close'));
    fireEvent.press(screen.getByTestId('crop-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

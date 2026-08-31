import {
  MB,
  croppablePresets,
  formatBytes,
  formatDuration,
  presetAspect,
  suggestPresetKey,
  validateFile,
  type UploadCropPreset,
} from '@duncit/media-picker';
import { defineDemo, defineDemos } from '../types';

interface CropMock {
  /** The image the user just chose. */
  image_width: number;
  image_height: number;
  bytes: number;
  video_seconds: number;
  /** Admin > Upload Settings for this surface. */
  presets: UploadCropPreset[];
}

export default defineDemos('media-picker', [
  defineDemo<CropMock>({
    id: 'crop',
    title: 'Which crop the picker offers first',
    note:
      'Make the image 1080×1920 and the suggestion moves to the portrait preset — the picker opens on the crop whose aspect is closest to what was actually chosen.',
    mock: {
      image_width: 1600,
      image_height: 900,
      bytes: 2_411_724,
      video_seconds: 94,
      presets: [
        { key: 'none', label: 'No crop', width: 0, height: 0, enabled: true },
        { key: 'square', label: 'Square', width: 1080, height: 1080, enabled: true },
        { key: 'landscape', label: 'Landscape', width: 1600, height: 900, enabled: true },
        { key: 'portrait', label: 'Portrait', width: 1080, height: 1920, enabled: true },
        { key: 'banner', label: 'Banner', width: 1920, height: 480, enabled: false },
      ],
    },
    compute: (mock) => {
      const croppable = croppablePresets(mock.presets);
      return {
        'Crops this surface offers': croppable.map((preset) => preset.label),
        'Disabled by the admin': mock.presets
          .filter((preset) => !preset.enabled)
          .map((preset) => preset.label),
        'Opens on': suggestPresetKey(mock.image_width, mock.image_height, mock.presets),
        'Source aspect': (mock.image_width / mock.image_height).toFixed(3),
        'Preset aspects': Object.fromEntries(
          croppable.map((preset) => [preset.label, presetAspect(preset)])
        ),
        'File size shown as': formatBytes(mock.bytes),
        'Video length shown as': formatDuration(mock.video_seconds),
      };
    },
  }),
  defineDemo<CapsMock>({
    id: 'caps',
    title: "What the admin's caps refuse",
    note:
      'Drop max_image_mb to 2 and the 3 MB pod cover is refused — the same sentence the user sees, from the same call the picker makes. Note the video: it is judged by max_video_mb, never by the image cap, which is the bug this replaced (one number for all three kinds).',
    mock: {
      max_image_mb: 8,
      max_video_mb: 60,
      allowed_image_formats: ['jpg', 'png', 'webp'],
      allowed_video_formats: ['mp4', 'mov'],
    },
    compute: (mock) => {
      const caps = {
        maxImageMb: mock.max_image_mb,
        maxVideoMb: mock.max_video_mb,
        allowedImageFormats: mock.allowed_image_formats,
        allowedVideoFormats: mock.allowed_video_formats,
      };
      const anything = { allowImage: true, allowVideo: true, allowDocuments: true };
      const file = (name: string, type: string, mb: number) =>
        ({ name, type, size: mb * MB }) as File;
      return {
        'Image caps at': `${mock.max_image_mb} MB`,
        'Video caps at': `${mock.max_video_mb} MB`,
        'pod-cover.jpg (3 MB)': validateFile(file('pod-cover.jpg', 'image/jpeg', 3), anything, caps) ?? 'accepted',
        'pod-reel.mp4 (45 MB)': validateFile(file('pod-reel.mp4', 'video/mp4', 45), anything, caps) ?? 'accepted',
        'venue-photo.heic (1 MB)': validateFile(file('venue-photo.heic', 'image/heic', 1), anything, caps) ?? 'accepted',
        'gst-certificate.pdf (4 MB)': validateFile(file('gst-certificate.pdf', 'application/pdf', 4), anything, caps) ?? 'accepted',
      };
    },
  }),
]);

interface CapsMock {
  max_image_mb: number;
  max_video_mb: number;
  allowed_image_formats: string[];
  allowed_video_formats: string[];
}

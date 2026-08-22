import {
  croppablePresets,
  formatBytes,
  formatDuration,
  presetAspect,
  suggestPresetKey,
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
]);

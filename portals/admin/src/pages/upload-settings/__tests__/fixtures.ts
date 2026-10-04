import type { UploadSettings } from '../queries';

/** One surface's settings, shaped exactly as UPLOAD_SETTINGS returns them. */
export const makeSettings = (over: Partial<UploadSettings> = {}): UploadSettings => ({
  id: 'us-portals',
  surface: 'PORTALS',
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: ['jpg', 'png'],
  allowed_video_formats: ['mp4'],
  image_compression_enabled: true,
  image_quality: 80,
  image_max_dimension: 1920,
  video_compression_enabled: true,
  video_crf: 28,
  video_max_height: 1080,
  ai_image_monitoring_enabled: false,
  default_crop_key: 'NO_CROP',
  crop_presets: [
    { key: 'NO_CROP', label: 'No Crop', width: 0, height: 0, enabled: true },
    { key: 'RATIO_16_9', label: '16:9', width: 1920, height: 1080, enabled: true },
    { key: 'CUSTOM_WIDE', label: 'Custom wide', width: 1200, height: 400, enabled: false },
  ],
  ...over,
});

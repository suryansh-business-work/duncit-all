import { gql } from '@apollo/client';

export { UPLOAD_SETTINGS } from '@duncit/media-picker';
export type { UploadCropPreset, UploadSettings, UploadSurface } from '@duncit/media-picker';

export const UPDATE_UPLOAD_SETTINGS = gql`
  mutation UpdateUploadSettings($surface: UploadSurface!, $input: UpdateUploadSettingInput!) {
    updateUploadSettings(surface: $surface, input: $input) {
      id
      surface
      max_image_mb
      max_video_mb
      allowed_image_formats
      allowed_video_formats
      image_compression_enabled
      image_quality
      image_max_dimension
      video_compression_enabled
      video_crf
      video_max_height
      ai_image_monitoring_enabled
      default_crop_key
      crop_presets {
        key
        label
        width
        height
        enabled
      }
      updated_at
    }
  }
`;

export const MEDIA_SCAN_LOGS_TABLE = gql`
  query MediaScanLogsTable($query: TableQueryInput) {
    mediaScanLogsTable(query: $query) {
      rows {
        id
        url
        file_name
        folder
        surface
        risk
        summary
        created_at
      }
      total
      page
      page_size
    }
  }
`;

export interface MediaScanLog {
  id: string;
  url: string;
  file_name: string;
  folder: string;
  surface: string;
  risk: 'PENDING' | 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  created_at: string;
}

export const SCAN_RISK_COLORS: Record<MediaScanLog['risk'], 'default' | 'success' | 'warning' | 'error'> = {
  PENDING: 'default',
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

export const SCAN_RISK_OPTIONS = ['PENDING', 'LOW', 'MEDIUM', 'HIGH'].map((value) => ({
  value,
  label: value,
}));

/**
 * Where each crop preset's resolution comes from (researched across the apps) —
 * shown as helper copy on the crop accordion.
 */
export const PRESET_USAGE_NOTES: Record<string, string> = {
  NO_CROP: 'Upload exactly as picked (default).',
  RATIO_16_9: 'Ad creatives, venues-card video and landscape hero media.',
  VERTICAL_9_16: 'Status/story viewer and Explore reels (full-screen vertical).',
  POD_FEATURE: 'Pod cover media — the create-pod field hints “Min 800×400px” (2:1).',
  POD_MOMENT: 'Club moments and profile post grids (1:1 tiles).',
  VENUE_PHOTO: 'Venue details photo gallery (4:3).',
  AVATAR: 'Profile avatar crop output (720×720 round).',
};

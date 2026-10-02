import type { CropRect } from '../cropRect';
import type { MediaDetails } from '../format';

export type UploadStage = 'processing' | 'uploading' | 'compressing';

export interface PickedMedia extends MediaDetails {
  uri: string;
  base64?: string | null;
}

export interface CropResult {
  cropRect: CropRect | null;
  cropPresetKey: string;
}

export const STAGE_LABELS: Record<UploadStage, string> = {
  processing: 'Cropping & compressing',
  uploading: 'Uploading',
  compressing: 'Compressing',
};

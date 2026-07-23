import { Schema, model, type Document } from 'mongoose';

/** Which client family a settings row applies to (admin Upload Settings pages):
 * PORTALS = all MUI portals; MOBILE = the native app; MWEB = the mWeb PWA. */
export const UPLOAD_SURFACES = ['PORTALS', 'MOBILE', 'MWEB'] as const;
export type UploadSurface = (typeof UPLOAD_SURFACES)[number];

/** Legacy surface (before the MOBILE / MWEB split) — still normalized on read
 * so any stray string path resolves to a valid surface instead of throwing. */
export const LEGACY_MOBILE_MWEB_SURFACE = 'MOBILE_MWEB';

/**
 * Coerce any inbound surface string to a valid {@link UploadSurface}. The old
 * merged `MOBILE_MWEB` value maps to `MOBILE`; anything unknown/omitted falls
 * back to `MOBILE` (the prior default before the split).
 */
export function normalizeSurface(surface?: string | null): UploadSurface {
  const value = String(surface ?? '').trim().toUpperCase();
  if (value === 'PORTALS') return 'PORTALS';
  if (value === 'MWEB') return 'MWEB';
  return 'MOBILE';
}

export interface IUploadCropPreset {
  /** Stable key, e.g. NO_CROP / RATIO_16_9 / POD_FEATURE. */
  key: string;
  label: string;
  /** Target output resolution; 0×0 = keep the source resolution (No Crop). */
  width: number;
  height: number;
  enabled: boolean;
}

export interface IUploadSetting extends Document {
  surface: UploadSurface;
  /** Max upload sizes (whole megabytes, admin-configurable, min 1). */
  max_image_mb: number;
  max_video_mb: number;
  /** Accepted file formats (lowercase extensions). */
  allowed_image_formats: string[];
  allowed_video_formats: string[];
  /** Server-side sharp image compression. */
  image_compression_enabled: boolean;
  image_quality: number;
  image_max_dimension: number;
  /** Server-side FFmpeg video compression. */
  video_compression_enabled: boolean;
  video_crf: number;
  video_max_height: number;
  /** Best-effort AI review of every uploaded IMAGE (images only). */
  ai_image_monitoring_enabled: boolean;
  /** Crop presets offered by the client crop UIs; default_crop_key names the
   * preselected one (NO_CROP by default). */
  default_crop_key: string;
  crop_presets: IUploadCropPreset[];
  created_at: Date;
  updated_at: Date;
}

const cropPresetSchema = new Schema<IUploadCropPreset>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    width: { type: Number, default: 0, min: 0 },
    height: { type: Number, default: 0, min: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const uploadSettingSchema = new Schema<IUploadSetting>(
  {
    surface: { type: String, required: true, unique: true, enum: UPLOAD_SURFACES },
    max_image_mb: { type: Number, default: 15, min: 1 },
    max_video_mb: { type: Number, default: 100, min: 1 },
    allowed_image_formats: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
    allowed_video_formats: { type: [String], default: ['mp4', 'mov', 'webm'] },
    image_compression_enabled: { type: Boolean, default: true },
    image_quality: { type: Number, default: 80, min: 1, max: 100 },
    image_max_dimension: { type: Number, default: 1920, min: 320 },
    video_compression_enabled: { type: Boolean, default: false },
    video_crf: { type: Number, default: 28, min: 18, max: 40 },
    video_max_height: { type: Number, default: 1080, min: 240 },
    ai_image_monitoring_enabled: { type: Boolean, default: true },
    default_crop_key: { type: String, default: 'NO_CROP' },
    crop_presets: { type: [cropPresetSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const UploadSettingModel = model<IUploadSetting>('UploadSetting', uploadSettingSchema);

/** Append-only AI review log for uploaded images (admin Upload Settings →
 * AI image monitoring). Written best-effort after every image upload. */
export interface IMediaScanLog extends Document {
  url: string;
  file_name: string;
  folder: string;
  surface: string;
  user_id?: string;
  risk: 'PENDING' | 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  created_at: Date;
  updated_at: Date;
}

const mediaScanLogSchema = new Schema<IMediaScanLog>(
  {
    url: { type: String, required: true },
    file_name: { type: String, default: '' },
    folder: { type: String, default: '' },
    surface: { type: String, default: '' },
    user_id: { type: String },
    risk: { type: String, enum: ['PENDING', 'LOW', 'MEDIUM', 'HIGH'], default: 'PENDING' },
    summary: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

mediaScanLogSchema.index({ created_at: -1 });

export const MediaScanLogModel = model<IMediaScanLog>('MediaScanLog', mediaScanLogSchema);

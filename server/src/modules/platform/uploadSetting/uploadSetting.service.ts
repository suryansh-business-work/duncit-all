import { GraphQLError } from 'graphql';
import {
  LEGACY_MOBILE_MWEB_SURFACE,
  UploadSettingModel,
  UPLOAD_SURFACES,
  type IUploadCropPreset,
  type IUploadSetting,
  type UploadSurface,
} from './uploadSetting.model';

/**
 * Crop presets seeded per surface — resolutions researched from the actual
 * render sites across the apps:
 * - NO_CROP: upload as picked (default).
 * - RATIO_16_9 1920×1080: ad creatives (AdCard 16/9), venues-card video,
 *   landscape hero media.
 * - VERTICAL_9_16 1080×1920: status/story full-screen viewer + Explore reels
 *   (vertical full-bleed).
 * - POD_FEATURE 1600×800 (2:1): pod cover media — the create-pod field hints
 *   "Min 800×400px" on both mWeb and mobile.
 * - POD_MOMENT 1080×1080 (1:1): club moments MomentTile + profile post grids.
 * - PRODUCT 1200×1200 (1:1): shop product cards + variant images (square grids).
 * - VENUE_PHOTO 1600×1200 (4:3): venue details photo gallery.
 * - AVATAR 720×720 (1:1): profile avatar crop output size.
 */
export const DEFAULT_CROP_PRESETS: IUploadCropPreset[] = [
  { key: 'NO_CROP', label: 'No Crop (Default)', width: 0, height: 0, enabled: true },
  { key: 'RATIO_16_9', label: '16:9 (1920×1080)', width: 1920, height: 1080, enabled: true },
  { key: 'VERTICAL_9_16', label: 'Vertical Image (1080×1920)', width: 1080, height: 1920, enabled: true },
  { key: 'POD_FEATURE', label: 'Pod Feature Image (1600×800)', width: 1600, height: 800, enabled: true },
  { key: 'POD_MOMENT', label: 'Pod Moment (1080×1080)', width: 1080, height: 1080, enabled: true },
  { key: 'PRODUCT', label: 'Product Image (1200×1200)', width: 1200, height: 1200, enabled: true },
  { key: 'VENUE_PHOTO', label: 'Venue Photo (1600×1200)', width: 1600, height: 1200, enabled: true },
  { key: 'AVATAR', label: 'Avatar (720×720)', width: 720, height: 720, enabled: true },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

const cleanFormats = (formats: unknown): string[] | undefined => {
  if (!Array.isArray(formats)) return undefined;
  const cleaned = formats
    .map((f) => String(f).trim().toLowerCase().replace(/^\./, ''))
    .filter((f) => /^[a-z0-9]{2,5}$/.test(f));
  return cleaned.length ? [...new Set(cleaned)] : undefined;
};

export interface UpdateUploadSettingInput {
  max_image_mb?: number;
  max_video_mb?: number;
  allowed_image_formats?: string[];
  allowed_video_formats?: string[];
  image_compression_enabled?: boolean;
  image_quality?: number;
  image_max_dimension?: number;
  video_compression_enabled?: boolean;
  video_crf?: number;
  video_max_height?: number;
  ai_image_monitoring_enabled?: boolean;
  default_crop_key?: string;
  crop_presets?: Array<Partial<IUploadCropPreset>>;
}

function assertSurface(surface: string): asserts surface is UploadSurface {
  if (!UPLOAD_SURFACES.includes(surface as UploadSurface)) {
    throw new GraphQLError('Unknown upload surface', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

function applyCropPresets(doc: IUploadSetting, input: UpdateUploadSettingInput): void {
  if (input.crop_presets === undefined) return;
  const presets = input.crop_presets
    .filter((p) => p && typeof p.key === 'string' && p.key.trim())
    .map((p) => ({
      key: String(p.key).trim().toUpperCase().slice(0, 40),
      label: String(p.label ?? p.key).trim().slice(0, 80),
      width: clamp(Number(p.width) || 0, 0, 8192),
      height: clamp(Number(p.height) || 0, 0, 8192),
      enabled: p.enabled !== false,
    }));
  if (presets.length) doc.crop_presets = presets;
}

/** Admin-tunable fields carried across the MOBILE_MWEB → MOBILE/MWEB split so a
 * new surface inherits any customisation instead of resetting to defaults. */
function carryOverConfig(src: IUploadSetting): Partial<IUploadSetting> {
  return {
    max_image_mb: src.max_image_mb,
    max_video_mb: src.max_video_mb,
    allowed_image_formats: [...src.allowed_image_formats],
    allowed_video_formats: [...src.allowed_video_formats],
    image_compression_enabled: src.image_compression_enabled,
    image_quality: src.image_quality,
    image_max_dimension: src.image_max_dimension,
    video_compression_enabled: src.video_compression_enabled,
    video_crf: src.video_crf,
    video_max_height: src.video_max_height,
    ai_image_monitoring_enabled: src.ai_image_monitoring_enabled,
    default_crop_key: src.default_crop_key,
    crop_presets: src.crop_presets.map((p) => ({ ...p })),
  };
}

/** Fields to seed a brand-new row with. MOBILE/MWEB inherit the retired
 * MOBILE_MWEB row's config when present; everything else uses defaults. */
async function seedFieldsFor(surface: UploadSurface): Promise<Partial<IUploadSetting>> {
  if (surface === 'MOBILE' || surface === 'MWEB') {
    const legacy = await UploadSettingModel.findOne({ surface: LEGACY_MOBILE_MWEB_SURFACE });
    if (legacy) return carryOverConfig(legacy);
  }
  return { crop_presets: DEFAULT_CROP_PRESETS };
}

export const uploadSettingService = {
  /** Settings row for a surface, seeded with defaults on first read. */
  async get(surface: string): Promise<IUploadSetting> {
    assertSurface(surface);
    const existing = await UploadSettingModel.findOne({ surface });
    if (existing) return existing;
    const seed = await seedFieldsFor(surface);
    return UploadSettingModel.findOneAndUpdate(
      { surface },
      { $setOnInsert: { surface, ...seed } },
      { new: true, upsert: true },
    ) as Promise<IUploadSetting>;
  },

  /** Both surfaces (admin Upload Settings pages). */
  async list(): Promise<IUploadSetting[]> {
    return Promise.all(UPLOAD_SURFACES.map((surface) => this.get(surface)));
  },

  async update(surface: string, input: UpdateUploadSettingInput): Promise<IUploadSetting> {
    const doc = await this.get(surface);
    if (input.max_image_mb !== undefined) doc.max_image_mb = clamp(input.max_image_mb, 1, 100);
    if (input.max_video_mb !== undefined) doc.max_video_mb = clamp(input.max_video_mb, 1, 500);
    const imageFormats = cleanFormats(input.allowed_image_formats);
    if (imageFormats) doc.allowed_image_formats = imageFormats;
    const videoFormats = cleanFormats(input.allowed_video_formats);
    if (videoFormats) doc.allowed_video_formats = videoFormats;
    if (input.image_compression_enabled !== undefined) {
      doc.image_compression_enabled = input.image_compression_enabled;
    }
    if (input.image_quality !== undefined) doc.image_quality = clamp(input.image_quality, 1, 100);
    if (input.image_max_dimension !== undefined) {
      doc.image_max_dimension = clamp(input.image_max_dimension, 320, 8192);
    }
    if (input.video_compression_enabled !== undefined) {
      doc.video_compression_enabled = input.video_compression_enabled;
    }
    if (input.video_crf !== undefined) doc.video_crf = clamp(input.video_crf, 18, 40);
    if (input.video_max_height !== undefined) {
      doc.video_max_height = clamp(input.video_max_height, 240, 4320);
    }
    if (input.ai_image_monitoring_enabled !== undefined) {
      doc.ai_image_monitoring_enabled = input.ai_image_monitoring_enabled;
    }
    applyCropPresets(doc, input);
    if (input.default_crop_key !== undefined) {
      const key = String(input.default_crop_key).trim().toUpperCase();
      const known = doc.crop_presets.some((p) => p.key === key);
      if (!known) {
        throw new GraphQLError('default_crop_key must match a crop preset', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      doc.default_crop_key = key;
    }
    await doc.save();
    return doc;
  },
};

import mongoose from 'mongoose';
import sharp from 'sharp';
import { uploadSettingService } from '@modules/platform/uploadSetting/uploadSetting.service';
import {
  normalizeSurface,
  type IUploadSetting,
} from '@modules/platform/uploadSetting/uploadSetting.model';

/** Source-pixel crop rectangle (react-easy-crop's croppedAreaPixels shape). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Settings for the caller's surface, or null when they cannot be read (no DB
 * connection — e.g. unit tests). Processing is an enhancement: a settings
 * outage must never fail an upload, so callers treat null as "no processing".
 */
export async function getUploadSettingsSafe(surface?: string | null): Promise<IUploadSetting | null> {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    return await uploadSettingService.get(normalizeSurface(surface));
  } catch {
    return null;
  }
}

// Only raster formats sharp round-trips safely; GIF (animation) and SVG
// (vector) pass through untouched.
const PROCESSABLE_MIME_RE = /^image\/(jpe?g|png|webp)$/i;

export const isProcessableImage = (mimeType: string) => PROCESSABLE_MIME_RE.test(mimeType);

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

/**
 * Crop / resize / compress an image with sharp per the admin Upload Settings:
 * 1. optional user crop rect (source pixels, from the client crop UI),
 * 2. optional crop-preset target resolution (16:9, Pod Feature, …),
 * 3. otherwise a max-dimension cap, plus quality re-encode, when compression
 *    is enabled. Returns the original bytes for non-processable formats.
 */
export async function processImageBytes(opts: {
  fileBytes: Buffer;
  mimeType: string;
  setting: IUploadSetting;
  crop?: CropRect | null;
  cropPresetKey?: string | null;
  /** Re-encode to JPEG regardless of source format (disallowed-format uploads). */
  forceJpeg?: boolean;
}): Promise<Buffer> {
  const { fileBytes, mimeType, setting } = opts;
  if (!isProcessableImage(mimeType)) return fileBytes;
  const hasCrop = !!opts.crop && opts.crop.width > 0 && opts.crop.height > 0;
  const hasPreset = !!opts.cropPresetKey;
  // Nothing to do — never re-encode (and degrade) an image for no reason.
  if (!hasCrop && !hasPreset && !setting.image_compression_enabled && !opts.forceJpeg) {
    return fileBytes;
  }

  const meta = await sharp(fileBytes, { failOn: 'none' }).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) return fileBytes;

  let pipeline = sharp(fileBytes, { failOn: 'none' });
  const crop = opts.crop;
  if (crop && crop.width > 0 && crop.height > 0) {
    const left = clampInt(crop.x, 0, srcW - 1);
    const top = clampInt(crop.y, 0, srcH - 1);
    pipeline = pipeline.extract({
      left,
      top,
      width: clampInt(crop.width, 1, srcW - left),
      height: clampInt(crop.height, 1, srcH - top),
    });
  }

  const preset = setting.crop_presets.find(
    (p) => p.key === (opts.cropPresetKey ?? '') && p.enabled && p.width > 0 && p.height > 0,
  );
  if (preset) {
    pipeline = pipeline.resize(preset.width, preset.height, {
      fit: 'cover',
      withoutEnlargement: true,
    });
  } else if (setting.image_compression_enabled) {
    pipeline = pipeline.resize({
      width: setting.image_max_dimension,
      height: setting.image_max_dimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (opts.forceJpeg) {
    return pipeline.jpeg({ quality: setting.image_quality, mozjpeg: true }).toBuffer();
  }
  if (setting.image_compression_enabled) {
    if (/jpe?g$/i.test(mimeType)) {
      pipeline = pipeline.jpeg({ quality: setting.image_quality, mozjpeg: true });
    } else if (/webp$/i.test(mimeType)) {
      pipeline = pipeline.webp({ quality: setting.image_quality });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }
  }
  return pipeline.toBuffer();
}

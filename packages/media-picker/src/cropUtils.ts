import type { UploadCropPreset } from './types';

/** Presets that can actually crop (enabled, with a real target resolution). */
export const croppablePresets = (presets: readonly UploadCropPreset[]) =>
  presets.filter((p) => p.enabled && p.width > 0 && p.height > 0);

export const presetAspect = (preset: UploadCropPreset): number =>
  preset.height > 0 ? preset.width / preset.height : 1;

/**
 * Suggested crop preset for an image (images only): the enabled preset whose
 * aspect ratio is closest to the source image's. Returns null when the presets
 * list has no croppable entry or the source size is unknown.
 */
export function suggestPresetKey(
  imageWidth: number,
  imageHeight: number,
  presets: readonly UploadCropPreset[],
): string | null {
  if (!imageWidth || !imageHeight) return null;
  const candidates = croppablePresets(presets);
  if (!candidates.length) return null;
  const sourceAspect = imageWidth / imageHeight;
  let best = candidates[0];
  let bestDelta = Math.abs(presetAspect(best) - sourceAspect);
  for (const candidate of candidates.slice(1)) {
    const delta = Math.abs(presetAspect(candidate) - sourceAspect);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best.key;
}

/** Human-readable size, e.g. "648 KB" / "12.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Seconds → "m:ss" for the video duration line. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

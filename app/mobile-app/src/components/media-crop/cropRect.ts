/** Source-pixel crop rectangle (matches the server's UploadCropRectInput). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.25;

/** Aspect ratio (w/h) of a preset; 1 when the height is missing. */
export function presetAspect(width: number, height: number): number {
  return height > 0 ? width / height : 1;
}

/** Presets that can actually crop (enabled, with a real target resolution). */
export function croppablePresets<T extends { enabled: boolean; width: number; height: number }>(
  presets: readonly T[],
): T[] {
  return presets.filter((p) => p.enabled && p.width > 0 && p.height > 0);
}

/**
 * The largest centered crop of `aspectW:aspectH` that fits inside the source,
 * then tightened by `zoom` (>= 1). Returns integer source pixels ready for the
 * server-side sharp extract. Falls back to the whole frame when the source or
 * aspect is degenerate.
 */
export function aspectCropRect(
  srcW: number,
  srcH: number,
  aspectW: number,
  aspectH: number,
  zoom: number,
): CropRect {
  if (srcW <= 0 || srcH <= 0 || aspectW <= 0 || aspectH <= 0) {
    return { x: 0, y: 0, width: Math.max(0, srcW), height: Math.max(0, srcH) };
  }
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const targetAspect = aspectW / aspectH;
  const sourceAspect = srcW / srcH;

  let baseW: number;
  let baseH: number;
  if (sourceAspect > targetAspect) {
    baseH = srcH;
    baseW = srcH * targetAspect;
  } else {
    baseW = srcW;
    baseH = srcW / targetAspect;
  }
  const width = baseW / z;
  const height = baseH / z;
  return {
    x: Math.round((srcW - width) / 2),
    y: Math.round((srcH - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Preview frame size for a given aspect (w/h), capped at `maxEdge` on its
 * longer side — landscape/square fill the width, portrait fills the height. */
export function previewBoxSize(aspect: number, maxEdge = 300): { width: number; height: number } {
  if (aspect <= 0) return { width: maxEdge, height: maxEdge };
  if (aspect >= 1) return { width: maxEdge, height: Math.round(maxEdge / aspect) };
  return { width: Math.round(maxEdge * aspect), height: maxEdge };
}

/**
 * Suggested preset key for an image — the croppable preset whose aspect is
 * closest to the source's. Null when there is no croppable preset or the size
 * is unknown. Mirrors media-picker's suggestPresetKey so native + web agree.
 */
export function suggestPresetKey(
  imageWidth: number,
  imageHeight: number,
  presets: readonly { key: string; width: number; height: number; enabled: boolean }[],
): string | null {
  if (!imageWidth || !imageHeight) return null;
  const [first, ...rest] = presets.filter((p) => p.enabled && p.width > 0 && p.height > 0);
  if (!first) return null;
  const sourceAspect = imageWidth / imageHeight;
  let best = first;
  let bestDelta = Math.abs(presetAspect(best.width, best.height) - sourceAspect);
  for (const candidate of rest) {
    const delta = Math.abs(presetAspect(candidate.width, candidate.height) - sourceAspect);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best.key;
}

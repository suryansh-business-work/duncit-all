/**
 * ImageKit resizes and crops by URL, not by re-uploading.
 *
 * That is the whole reason "customize" here does not touch the stored file: a
 * transformation is a query parameter on the link you copy, so one upload can
 * serve a 96px avatar and a 1200px hero, and changing your mind costs nothing.
 * The original is never overwritten, which also means a crop can never lose it.
 */

export interface Transform {
  width: string;
  height: string;
  /** ImageKit's crop mode — how it reconciles a mismatched aspect ratio. */
  crop: string;
  /** 1-100, or empty for ImageKit's default. */
  quality: string;
  format: string;
  /** Corner radius in px, or the literal 'max' for a circle. */
  radius: string;
  blur: string;
  grayscale: boolean;
}

export const EMPTY_TRANSFORM: Transform = {
  width: '',
  height: '',
  crop: '',
  quality: '',
  format: '',
  radius: '',
  blur: '',
  grayscale: false,
};

export const CROP_MODES = [
  { value: '', label: 'Default' },
  { value: 'maintain_ratio', label: 'Maintain ratio' },
  { value: 'pad_resize', label: 'Pad to fit' },
  { value: 'force', label: 'Stretch to fit' },
  { value: 'at_max', label: 'Fit inside' },
  { value: 'at_least', label: 'Cover' },
];

export const FORMATS = [
  { value: '', label: 'Auto' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jpg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

const NUMERIC: [keyof Transform, string][] = [
  ['width', 'w'],
  ['height', 'h'],
  ['quality', 'q'],
  ['blur', 'bl'],
];

/** The `tr=` value, or '' when nothing has been asked for. */
export function buildTransform(t: Transform): string {
  const parts: string[] = [];
  for (const [key, prefix] of NUMERIC) {
    const value = String(t[key]).trim();
    if (value) parts.push(`${prefix}-${value}`);
  }
  if (t.crop) parts.push(`c-${t.crop}`);
  if (t.format) parts.push(`f-${t.format}`);
  if (t.radius) parts.push(`r-${t.radius}`);
  if (t.grayscale) parts.push('e-grayscale');
  return parts.join(',');
}

/**
 * The link to copy.
 *
 * The transformation goes in the query string rather than the path, because a
 * path-style transformation has to sit at a fixed position in the URL and these
 * files come back from ImageKit with their own paths already in them.
 */
export function transformedUrl(url: string, t: Transform): string {
  const tr = buildTransform(t);
  if (!tr) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tr=${tr}`;
}

/** A small, cheap version for a grid tile. */
export function thumbUrl(url: string, size = 240): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tr=w-${size},h-${size},c-maintain_ratio`;
}

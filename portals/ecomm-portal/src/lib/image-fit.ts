/**
 * Resizing a picked picture to the size its storefront slot draws it at,
 * before it is uploaded — so an operator can hand in any photo or logo.
 *
 * `cover` fills the box and crops the overflow evenly from both sides;
 * `contain` fits the whole picture inside and leaves the rest transparent.
 */
export type FitMode = 'contain' | 'cover';
export type FitType = 'image/webp' | 'image/png';

export interface ImageFit {
  width: number;
  height: number;
  mode: FitMode;
  /** Defaults to WebP, which keeps transparency. A browser that cannot encode it hands back PNG. */
  type?: FitType;
}

interface Placement {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

const QUALITY = 0.9;
const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };

/** Where a `width × height` source lands in the target box. */
export function placement(width: number, height: number, fit: Readonly<ImageFit>): Placement {
  const scaleX = fit.width / width;
  const scaleY = fit.height / height;
  const scale = fit.mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const dw = width * scale;
  const dh = height * scale;
  return { dx: (fit.width - dw) / 2, dy: (fit.height - dh) / 2, dw, dh };
}

const toBlob = (canvas: HTMLCanvasElement, type: FitType): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas produced no image'))), type, QUALITY);
  });

/** The picked file's name with the extension of what it now holds. */
const renamed = (name: string, type: string): string => {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name) || 'image';
  return `${base}.${EXTENSIONS[type] ?? 'png'}`;
};

/** Vector art scales itself, and anything that is not a picture is left for the uploader to refuse. */
const passesThrough = (file: File): boolean => file.type === 'image/svg+xml' || !file.type.startsWith('image/');

/** Resize (and for `cover`, crop) a picked picture to `fit`. Throws when the browser cannot read it. */
export async function fitImage(file: File, fit: Readonly<ImageFit>): Promise<File> {
  if (passesThrough(file)) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = fit.width;
    canvas.height = fit.height;
    const context = canvas.getContext('2d');
    // A developer diagnostic (logged by the caller); the operator sees ecommPortal.form.imageFitFailed.
    if (!context) throw new Error('canvas-2d-context-unavailable');
    context.imageSmoothingQuality = 'high';
    const { dx, dy, dw, dh } = placement(bitmap.width, bitmap.height, fit);
    context.drawImage(bitmap, dx, dy, dw, dh);
    const blob = await toBlob(canvas, fit.type ?? 'image/webp');
    return new File([blob], renamed(file.name, blob.type), { type: blob.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

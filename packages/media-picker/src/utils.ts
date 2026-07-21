import type { FilePolicy } from './types';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export function pickBestVideoFile(v: any) {
  const files = (v.video_files || []) as any[];
  if (!files.length) return null;
  const sorted = [...files].sort((a, b) => {
    const aHd = a.quality === 'hd' ? 1 : 0;
    const bHd = b.quality === 'hd' ? 1 : 0;
    if (aHd !== bHd) return bHd - aHd;
    return (b.width || 0) - (a.width || 0);
  });
  const reasonable = sorted.find((f) => (f.height || 0) <= 1080) || sorted[0];
  return reasonable;
}

/** Admin-managed overrides for the static package limits (Upload Settings). */
export interface FileCaps {
  maxImageMb?: number;
  maxVideoMb?: number;
  allowedImageFormats?: string[];
  allowedVideoFormats?: string[];
}

const fileExt = (name: string) => {
  const ext = /\.([a-z0-9]{2,5})$/i.exec(name)?.[1]?.toLowerCase() ?? '';
  return ext === 'jpeg' ? 'jpg' : ext;
};

const formatAllowed = (name: string, formats?: string[]) => {
  if (!formats?.length) return true;
  const ext = fileExt(name);
  if (!ext) return true;
  return formats.map((f) => (f === 'jpeg' ? 'jpg' : f)).includes(ext);
};

/**
 * Gate a device-picked file against the picker's accept policy and the
 * admin-managed Upload Settings caps/formats (when loaded).
 * Returns an error message, or null when the file is acceptable.
 */
export function validateFile(
  file: File,
  policy: Readonly<FilePolicy>,
  caps: Readonly<FileCaps> = {},
): string | null {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isPdf = file.type === 'application/pdf';

  // Honour the picker's `accept` contract in every branch. The old admin copy
  // only asked "is it an image or a video?" and ignored allowImage/allowVideo,
  // so an accept="image/*" picker (mWeb's avatar, admin's branding assets) would
  // happily take a 100 MB video. The mWeb/partners copy got this right; keep it.
  const accepted =
    (policy.allowImage && isImage) ||
    (policy.allowVideo && isVideo) ||
    (policy.allowDocuments && isPdf);
  if (!accepted) {
    return policy.allowDocuments
      ? 'Please choose a PDF document'
      : 'Please choose an image or video file';
  }

  if (isVideo) {
    if (!formatAllowed(file.name, caps.allowedVideoFormats)) {
      return `Video format not allowed (allowed: ${caps.allowedVideoFormats?.join(', ')})`;
    }
    const maxMb = caps.maxVideoMb ?? MAX_VIDEO_BYTES / (1024 * 1024);
    return file.size > maxMb * 1024 * 1024 ? `Video is too large (max ${maxMb} MB)` : null;
  }
  if (isPdf) {
    return file.size > MAX_DOCUMENT_BYTES ? 'Document is too large (max 50 MB)' : null;
  }
  if (!formatAllowed(file.name, caps.allowedImageFormats)) {
    return `Image format not allowed (allowed: ${caps.allowedImageFormats?.join(', ')})`;
  }
  const maxMb = caps.maxImageMb ?? MAX_IMAGE_BYTES / (1024 * 1024);
  return file.size > maxMb * 1024 * 1024 ? `Image is too large (max ${maxMb} MB)` : null;
}

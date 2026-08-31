import type { FilePolicy } from './types';

/** One megabyte, so a cap reads in the unit the admin panel is written in. */
export const MB = 1024 * 1024;

/**
 * What a picker allows until Upload Settings answer — and if they never do.
 * Admin > Upload Settings is the real source for images and videos; these are
 * the floor under a settings outage, never a second opinion about the rule.
 */
export const DEFAULT_IMAGE_MAX_MB = 15;
export const DEFAULT_VIDEO_MAX_MB = 100;
/**
 * Documents are not an admin setting, so this is the server's own ceiling
 * (`DOCUMENT_MAX_MB` in upload.service.ts). It lives here so every picker
 * refuses exactly what the upload would refuse, rather than each inventing a
 * smaller number and rejecting files the server would have taken.
 */
export const DEFAULT_DOCUMENT_MAX_MB = 100;

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

const validateVideoFile = (file: File, caps: Readonly<FileCaps>): string | null => {
  if (!formatAllowed(file.name, caps.allowedVideoFormats)) {
    return `Video format not allowed (allowed: ${caps.allowedVideoFormats?.join(', ')})`;
  }
  const maxMb = caps.maxVideoMb ?? DEFAULT_VIDEO_MAX_MB;
  return file.size > maxMb * MB ? `Video is too large (max ${maxMb} MB)` : null;
};

const validateImageFile = (file: File, caps: Readonly<FileCaps>): string | null => {
  if (!formatAllowed(file.name, caps.allowedImageFormats)) {
    return `Image format not allowed (allowed: ${caps.allowedImageFormats?.join(', ')})`;
  }
  const maxMb = caps.maxImageMb ?? DEFAULT_IMAGE_MAX_MB;
  return file.size > maxMb * MB ? `Image is too large (max ${maxMb} MB)` : null;
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
    return validateVideoFile(file, caps);
  }
  if (isPdf) {
    return file.size > DEFAULT_DOCUMENT_MAX_MB * MB
      ? `Document is too large (max ${DEFAULT_DOCUMENT_MAX_MB} MB)`
      : null;
  }
  return validateImageFile(file, caps);
}

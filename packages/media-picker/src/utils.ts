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

/**
 * Gate a device-picked file against the picker's accept policy.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateFile(file: File, policy: Readonly<FilePolicy>): string | null {
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
    return file.size > MAX_VIDEO_BYTES ? 'Video is too large (max 100 MB)' : null;
  }
  if (isPdf) {
    return file.size > MAX_DOCUMENT_BYTES ? 'Document is too large (max 50 MB)' : null;
  }
  return file.size > MAX_IMAGE_BYTES ? 'Image is too large (max 15 MB)' : null;
}

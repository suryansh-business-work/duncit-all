import { useTranslation } from '@/hooks/useTranslation';
import { useUploadSettings } from '@/hooks/useUploadSettings';

/** One megabyte, so a cap reads in the unit the admin panel is written in. */
export const MB = 1024 * 1024;

/**
 * What the app allows until Upload Settings answer — and if they never do.
 * Admin > Upload Settings (MOBILE) is the real source for images and videos.
 */
const DEFAULT_IMAGE_MAX_MB = 15;
const DEFAULT_VIDEO_MAX_MB = 100;
/** Documents are not an admin setting; this is the server's own ceiling. */
const DEFAULT_DOCUMENT_MAX_MB = 100;

/** A picker often reports a generic mime, so the extension decides too — a
 * video must not slip past its own cap by arriving as an octet-stream. */
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|webm|mkv|3gp|ts|flv|wmv|mpe?g)$/i;

export interface PickedFile {
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
}

export const isVideoPick = (file: PickedFile): boolean =>
  (file.mimeType ?? '').startsWith('video/') || VIDEO_EXT_RE.test(file.name ?? '');

export interface UploadLimits {
  maxImageBytes: number;
  maxVideoBytes: number;
  maxDocumentBytes: number;
  /** The sentence to show if the file is over its cap, or null if it fits. */
  tooLarge: (file: PickedFile) => string | null;
}

/**
 * The admin's upload rules for the native app, as the numbers a picker works in
 * — the Tamagui twin of mWeb's `useAttachmentGate` (rule 27), reading the same
 * settings row the server enforces on the way in.
 *
 * Every attachment path used to carry its own pair of constants (50 MB video,
 * 100 MB everything else), so an image was judged by a document's ceiling and
 * no number was the one the admin panel showed.
 */
export function useUploadLimits(): UploadLimits {
  const { t } = useTranslation();
  const settings = useUploadSettings();
  const maxImageBytes = (settings?.max_image_mb ?? DEFAULT_IMAGE_MAX_MB) * MB;
  const maxVideoBytes = (settings?.max_video_mb ?? DEFAULT_VIDEO_MAX_MB) * MB;
  const maxDocumentBytes = DEFAULT_DOCUMENT_MAX_MB * MB;

  const capFor = (file: PickedFile) => {
    if (isVideoPick(file)) return { bytes: maxVideoBytes, key: 'mweb.common.videoIsTooLargeMax' };
    if ((file.mimeType ?? '').startsWith('image/')) {
      return { bytes: maxImageBytes, key: 'mweb.common.imageIsTooLargeMax' };
    }
    return { bytes: maxDocumentBytes, key: 'mweb.common.fileIsTooLargeMax' };
  };

  return {
    maxImageBytes,
    maxVideoBytes,
    maxDocumentBytes,
    tooLarge: (file) => {
      const { bytes, key } = capFor(file);
      if (typeof file.size !== 'number' || file.size <= bytes) return null;
      return t(key, { vars: { max: Math.round(bytes / MB) } });
    },
  };
}

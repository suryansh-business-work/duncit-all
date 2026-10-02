import type { useTranslation } from '../i18n/useTranslation';
import type { UploadStage } from '../useDeviceUpload';
import type { UploadSettings } from '../types';

/** Just the translate function, so the helpers below stay at module scope. */
type Translate = ReturnType<typeof useTranslation>['t'];

// Copy + hint derived from the accepted MIME list so a PDF-only picker never
// claims "image" and a video-only picker (pod reels) never claims "image".
export function dropHints(
  accept: string,
  settings: UploadSettings | null,
  t: Translate,
): { label: string; hint: string } {
  const imageMb = settings?.max_image_mb ?? 15;
  const videoMb = settings?.max_video_mb ?? 100;
  if (/pdf/i.test(accept) && !/image\//i.test(accept)) {
    return { label: t('media.device.choosePdf'), hint: t('media.device.hintPdf') };
  }
  if (/video\//i.test(accept) && !/image\//i.test(accept)) {
    return {
      label: t('media.device.chooseVideo'),
      hint: t('media.device.hintVideo', { vars: { mb: videoMb } }),
    };
  }
  return {
    label: t('media.device.chooseImage'),
    hint: t('media.device.hintImage', { vars: { mb: imageMb } }),
  };
}

export function mediaKind(picked: File | null): 'image' | 'video' | 'other' {
  if (picked?.type.startsWith('image/')) return 'image';
  if (picked?.type.startsWith('video/')) return 'video';
  return 'other';
}

export const STAGE_KEYS: Record<UploadStage, string> = {
  uploading: 'media.device.uploading',
  compressing: 'media.device.compressing',
  processing: 'media.device.croppingAndCompressing',
};

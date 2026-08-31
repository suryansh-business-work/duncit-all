import { MB, useUploadCaps } from '@duncit/media-picker';
import { isVideoUpload } from './attachment';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Gate a picked attachment against Admin > Upload Settings for mWeb.
 *
 * Every attachment field used to carry its own pair of constants — 100 MB for
 * "images and documents", 50 MB for video — which meant an image was judged by
 * a document's ceiling and neither number was the one the admin had set or the
 * server would enforce. Here the kind decides the cap, the cap comes from the
 * settings row, and the sentence carries whatever number that turned out to be.
 */
export function useAttachmentGate() {
  const { t } = useTranslation();
  const caps = useUploadCaps('MWEB');

  return (file: File): string | null => {
    const mb = (bytes: number) => Math.round(bytes / MB);
    if (isVideoUpload(file.name, file.type)) {
      if (file.size <= caps.maxVideoBytes) return null;
      return t('mweb.common.videoIsTooLargeMax', { vars: { max: mb(caps.maxVideoBytes) } });
    }
    if (file.type.startsWith('image/')) {
      if (file.size <= caps.maxImageBytes) return null;
      return t('mweb.common.imageIsTooLargeMax', { vars: { max: mb(caps.maxImageBytes) } });
    }
    if (file.size <= caps.maxDocumentBytes) return null;
    return t('mweb.common.fileIsTooLargeMax', { vars: { max: mb(caps.maxDocumentBytes) } });
  };
}

import type { Translate } from '../i18n/useTranslation';

/** What the finishing button says: the upload in flight, how many picks, or
 * — for a single pick — whether it is a document or an image. */
export function doneLabel(
  t: Translate,
  { count, uploading, pendingDocument }: Readonly<{ count: number; uploading: boolean; pendingDocument: boolean }>,
): string {
  if (uploading) return t('media.picker.uploading');
  if (count > 1) return t('media.picker.useTheseCount', { vars: { count } });
  return pendingDocument ? t('media.picker.uploadDocument') : t('media.picker.useThis');
}

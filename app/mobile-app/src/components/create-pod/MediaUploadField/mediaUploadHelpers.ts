import type { Translate } from '@/i18n/fallback';

export const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Formats + size hint sourced from admin Upload Settings (no hardcoded copy). */
export function uploadHint(
  t: Translate,
  formats: string[] | undefined,
  maxImageMb: number | undefined,
): string {
  if (!formats?.length || !maxImageMb) return t('mweb.createPod.cropAfterSelecting');
  const list = formats.map((f) => f.toUpperCase()).join(', ');
  return t('mweb.createPod.uploadFormatsHint', { vars: { formats: list, mb: maxImageMb } });
}

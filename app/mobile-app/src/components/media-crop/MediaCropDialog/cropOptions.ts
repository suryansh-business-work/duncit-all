import type { UploadCropPreset } from '@/hooks/useUploadSettings';
import { fallbackT, type Translate } from '@/i18n/fallback';

import { croppablePresets } from '../cropRect';

/** The preset key is a STORED identifier, so it stays English while its label
 * is translated. */
export const NO_CROP_KEY = 'NO_CROP';

const noCrop = (t: Translate): UploadCropPreset => ({
  key: NO_CROP_KEY,
  label: t('mweb.mediaCrop.noCrop'),
  width: 0,
  height: 0,
  enabled: true,
});

export function optionsFor(
  presets: readonly UploadCropPreset[],
  t: Translate = fallbackT,
): UploadCropPreset[] {
  return [noCrop(t), ...croppablePresets(presets)];
}

export function initialKey(
  options: readonly UploadCropPreset[],
  suggestedKey: string | null,
  defaultCropKey: string,
): string {
  const preferred = suggestedKey ?? defaultCropKey;
  return options.some((o) => o.key === preferred) ? preferred : NO_CROP_KEY;
}

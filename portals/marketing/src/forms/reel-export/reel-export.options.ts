import type { RhfSelectOption } from '@duncit/forms';
import type { Translate } from '@duncit/shell';
import { CODECS_BY_CONTAINER, type ExportContainer, type ExportVideoCodec } from './reel-export.types';

/**
 * The export form's choices, each with its words. Written as literal keys on
 * purpose: the localization gate reads `t('…')` calls, and a key assembled
 * from a value would be invisible to it.
 */

export const containerOptions = (t: Translate): RhfSelectOption[] => [
  { value: 'mp4', label: t('ai.reels.exportOptions.containerMp4') },
  { value: 'webm', label: t('ai.reels.exportOptions.containerWebm') },
  { value: 'mkv', label: t('ai.reels.exportOptions.containerMkv') },
  { value: 'mov', label: t('ai.reels.exportOptions.containerMov') },
  { value: 'mp3', label: t('ai.reels.exportOptions.containerMp3') },
  { value: 'wav', label: t('ai.reels.exportOptions.containerWav') },
];

const codecLabel = (t: Translate, codec: ExportVideoCodec): string => {
  switch (codec) {
    case 'h264':
      return t('ai.reels.exportOptions.codecH264');
    case 'h265':
      return t('ai.reels.exportOptions.codecH265');
    case 'vp9':
      return t('ai.reels.exportOptions.codecVp9');
    case 'vp8':
      return t('ai.reels.exportOptions.codecVp8');
    default:
      return t('ai.reels.exportOptions.codecAv1');
  }
};

/** Only the codecs the chosen file type can carry. */
export const codecOptions = (t: Translate, container: ExportContainer): RhfSelectOption[] =>
  CODECS_BY_CONTAINER[container].map((codec) => ({ value: codec, label: codecLabel(t, codec) }));

export const qualityOptions = (t: Translate): RhfSelectOption[] => [
  { value: 'very-low', label: t('ai.reels.exportOptions.qualityVeryLow') },
  { value: 'low', label: t('ai.reels.exportOptions.qualityLow') },
  { value: 'medium', label: t('ai.reels.exportOptions.qualityMedium') },
  { value: 'high', label: t('ai.reels.exportOptions.qualityHigh') },
  { value: 'very-high', label: t('ai.reels.exportOptions.qualityVeryHigh') },
];

export const scaleOptions = (t: Translate): RhfSelectOption[] => [
  { value: '0.5', label: t('ai.reels.exportOptions.scaleHalf') },
  { value: '1', label: t('ai.reels.exportOptions.scaleOne') },
  { value: '1.5', label: t('ai.reels.exportOptions.scaleOneHalf') },
  { value: '2', label: t('ai.reels.exportOptions.scaleTwo') },
];

export const hardwareOptions = (t: Translate): RhfSelectOption[] => [
  { value: 'no-preference', label: t('ai.reels.exportOptions.hardwareAuto') },
  { value: 'prefer-hardware', label: t('ai.reels.exportOptions.hardwareGpu') },
  { value: 'prefer-software', label: t('ai.reels.exportOptions.hardwareCpu') },
];

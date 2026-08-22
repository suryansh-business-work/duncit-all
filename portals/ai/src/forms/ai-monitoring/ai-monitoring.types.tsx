import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Validation for AI Monitoring > Settings.
 *
 * Built from the active catalogue rather than frozen at module load: every
 * message here is copy a reader sees under a field.
 *
 * Every copy field is optional: blank means "use the shipped localized
 * fallback", which is a real choice an operator makes, not an empty form. Only
 * the image prompt is required — a blank prompt would leave the vision call
 * with no instructions at all.
 */
export const buildAiMonitoringSchema = (t: Translate) =>
  z.object({
  chip_enabled: z.boolean().default(true),
  chip_label: z.string().trim().max(80, t('ai.validation.chipLabelMax')).default(''),
  dialog_title: z.string().trim().max(160, t('ai.validation.titleMax')).default(''),
  dialog_intro: z
    .string()
    .trim()
    .max(1000, t('ai.validation.introMax'))
    .default(''),
  dialog_points: z
    .string()
    .trim()
    .max(3600, t('ai.validation.bulletsMax'))
    .default('')
    .refine(
      (value) => value.split('\n').filter((line) => line.trim()).length <= 12,
      t('ai.validation.bulletsCount'),
    ),
  dialog_footnote: z
    .string()
    .trim()
    .max(500, t('ai.validation.footnoteMax'))
    .default(''),
  dismiss_label: z.string().trim().max(60, t('ai.validation.dismissMax')).default(''),
  image_prompt: z
    .string()
    .trim()
    .min(1, t('ai.validation.promptRequired'))
    .min(20, t('ai.validation.promptMin'))
    .max(20000, t('ai.validation.promptMax')),
});

export interface AiMonitoringFormValues {
  chip_enabled: boolean;
  chip_label: string;
  dialog_title: string;
  dialog_intro: string;
  /** One bullet per line — flattened here, split on submit. */
  dialog_points: string;
  dialog_footnote: string;
  dismiss_label: string;
  image_prompt: string;
}

export const aiMonitoringInitialValues: AiMonitoringFormValues = {
  chip_enabled: true,
  chip_label: '',
  dialog_title: '',
  dialog_intro: '',
  dialog_points: '',
  dialog_footnote: '',
  dismiss_label: '',
  image_prompt: '',
};

export interface AiMonitoringFormProps {
  initialValues?: Partial<AiMonitoringFormValues>;
  submitting?: boolean;
  /** The model the image check runs on — shown so the prompt is written for it. */
  scanModel?: string;
  /** The Prompt Library key this prompt is stored under (one store, not two). */
  promptKey?: string;
  onSubmit: (values: AiMonitoringFormValues) => Promise<void> | void;
}

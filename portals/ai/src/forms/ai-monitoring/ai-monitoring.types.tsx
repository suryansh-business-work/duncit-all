import { z } from 'zod';

/**
 * Validation for AI Monitoring > Settings.
 *
 * Every copy field is optional: blank means "use the shipped localized
 * fallback", which is a real choice an operator makes, not an empty form. Only
 * the image prompt is required — a blank prompt would leave the vision call
 * with no instructions at all.
 */
export const aiMonitoringSchema = z.object({
  chip_enabled: z.boolean().default(true),
  chip_label: z.string().trim().max(80, 'Keep the chip label under 80 characters').default(''),
  dialog_title: z.string().trim().max(160, 'Keep the title under 160 characters').default(''),
  dialog_intro: z
    .string()
    .trim()
    .max(1000, 'Keep the intro under 1000 characters')
    .default(''),
  dialog_points: z
    .string()
    .trim()
    .max(3600, 'That is too many bullets — keep the list under 3600 characters')
    .default('')
    .refine(
      (value) => value.split('\n').filter((line) => line.trim()).length <= 12,
      'Twelve bullets is the maximum a reader will take in',
    ),
  dialog_footnote: z
    .string()
    .trim()
    .max(500, 'Keep the footnote under 500 characters')
    .default(''),
  dismiss_label: z.string().trim().max(60, 'Keep the button label under 60 characters').default(''),
  image_prompt: z
    .string()
    .trim()
    .min(1, 'The image prompt is required')
    .min(20, 'Give the model at least 20 characters of instruction')
    .max(20000, 'Prompt is too long (max 20000 characters)'),
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

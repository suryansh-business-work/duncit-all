import { z } from 'zod';

export const BADGE_CONDITIONS = [
  'PODS_HOSTED',
  'PODS_ATTENDED',
  'PROFILE_COMPLETE',
  'MANUAL',
] as const;

export type BadgeCondition = (typeof BADGE_CONDITIONS)[number];

export const badgeFormSchema = z
  .object({
    title: z
      .string({ error: 'Title is required' })
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(80, 'Title must be 80 characters or fewer'),
    description: z.string().trim().max(500).default(''),
    image_url: z.string().trim().max(1000).default(''),
    condition_type: z.enum(BADGE_CONDITIONS, {
      error: (issue) => (issue.input == null ? 'Condition is required' : 'Select a valid condition'),
    }),
    threshold: z
      .number()
      .int('Threshold must be a whole number')
      .min(0, 'Threshold must be 0 or greater')
      .max(1_000_000)
      .optional(),
    is_active: z.boolean().default(true),
  })
  // A counted condition needs a threshold; MANUAL falls back to 0.
  .refine((values) => values.condition_type === 'MANUAL' || values.threshold !== undefined, {
    path: ['threshold'],
    error: 'Threshold is required',
  })
  .transform((values) => ({ ...values, threshold: values.threshold ?? 0 }));

export type BadgeFormValues = z.infer<typeof badgeFormSchema>;

/** Normalises like the schema does (trim + defaults) without validating. */
export function toBadgeInput(values: z.input<typeof badgeFormSchema>) {
  return {
    title: values.title.trim(),
    description: (values.description ?? '').trim() || null,
    image_url: (values.image_url ?? '').trim() || null,
    condition_type: values.condition_type,
    threshold: values.condition_type === 'MANUAL' ? 0 : Number(values.threshold) || 0,
    is_active: values.is_active ?? true,
  };
}

import * as yup from 'yup';

export const BADGE_CONDITIONS = [
  'PODS_HOSTED',
  'PODS_ATTENDED',
  'PROFILE_COMPLETE',
  'MANUAL',
] as const;

export type BadgeCondition = (typeof BADGE_CONDITIONS)[number];

export const badgeFormSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(80, 'Title must be 80 characters or fewer')
    .required('Title is required'),
  description: yup.string().trim().max(500).default(''),
  image_url: yup.string().trim().max(1000).default(''),
  condition_type: yup
    .mixed<BadgeCondition>()
    .oneOf([...BADGE_CONDITIONS], 'Select a valid condition')
    .required('Condition is required'),
  threshold: yup
    .number()
    .integer('Threshold must be a whole number')
    .min(0, 'Threshold must be 0 or greater')
    .max(1_000_000)
    .when('condition_type', {
      is: (value: BadgeCondition) => value !== 'MANUAL',
      then: (schema) => schema.required('Threshold is required'),
      otherwise: (schema) => schema.default(0),
    }),
  is_active: yup.boolean().default(true),
});

export type BadgeFormValues = yup.InferType<typeof badgeFormSchema>;

export function toBadgeInput(values: BadgeFormValues) {
  const cast = badgeFormSchema.cast(values, { stripUnknown: true });
  return {
    title: cast.title,
    description: cast.description || null,
    image_url: cast.image_url || null,
    condition_type: cast.condition_type,
    threshold: cast.condition_type === 'MANUAL' ? 0 : Number(cast.threshold) || 0,
    is_active: cast.is_active,
  };
}

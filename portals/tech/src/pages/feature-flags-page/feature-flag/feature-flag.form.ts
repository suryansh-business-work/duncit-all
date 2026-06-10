import * as yup from 'yup';
import { SLUG_KEY_PATTERN } from '../../../forms/validation/rules';

export const featureFlagFormSchema = yup.object({
  key: yup
    .string()
    .trim()
    .matches(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores')
    .max(60, 'Key must be 60 characters or fewer')
    .required('Key is required'),
  name: yup
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer')
    .required('Name is required'),
  description: yup.string().trim().max(500).default(''),
  is_enabled: yup.boolean().default(false),
});

export type FeatureFlagFormValues = yup.InferType<typeof featureFlagFormSchema>;

export function toFeatureFlagInput(values: FeatureFlagFormValues) {
  const cast = featureFlagFormSchema.cast(values, { stripUnknown: true });
  return {
    key: cast.key,
    name: cast.name,
    description: cast.description || null,
    is_enabled: cast.is_enabled,
  };
}

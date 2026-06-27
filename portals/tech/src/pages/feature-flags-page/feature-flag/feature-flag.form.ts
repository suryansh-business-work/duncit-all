import { z } from 'zod';
import { SLUG_KEY_PATTERN } from '../../../forms/validation/rules';

export const featureFlagFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key is required')
    .max(60, 'Key must be 60 characters or fewer')
    .regex(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
  description: z.string().trim().max(500).default(''),
  is_enabled: z.boolean().default(false),
});

export type FeatureFlagFormValues = z.infer<typeof featureFlagFormSchema>;

export function toFeatureFlagInput(values: FeatureFlagFormValues) {
  const parsed = featureFlagFormSchema.parse(values);
  return {
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    is_enabled: parsed.is_enabled,
  };
}

import * as yup from 'yup';
import { SLUG_KEY_PATTERN } from '../../../forms/validation/rules';

const httpUrl = yup
  .string()
  .trim()
  .default('')
  .test('http-url', 'Image URL must be a valid http(s) URL', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });

export const podPlanFormSchema = yup.object({
  key: yup
    .string()
    .trim()
    .matches(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores')
    .max(40, 'Key must be 40 characters or fewer')
    .required('Key is required'),
  name: yup
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name must be 80 characters or fewer')
    .required('Name is required'),
  description: yup.string().trim().max(500).default(''),
  image_url: httpUrl,
  features: yup.array(yup.string().trim().required().max(120)).max(20).default([]),
  price_label: yup.string().trim().max(60).default(''),
  sort_order: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(999)
    .required('Sort order is required'),
  is_coming_soon: yup.boolean().default(false),
  is_active: yup.boolean().default(true),
});

export type PodPlanFormValues = yup.InferType<typeof podPlanFormSchema>;

export function parsePodPlanFeatures(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function toPodPlanInput(values: PodPlanFormValues) {
  const cast = podPlanFormSchema.cast(values, { stripUnknown: true });
  return {
    key: cast.key,
    name: cast.name,
    description: cast.description || null,
    image_url: cast.image_url || null,
    features: cast.features,
    price_label: cast.price_label || null,
    sort_order: Number(cast.sort_order) || 0,
    is_coming_soon: cast.is_coming_soon,
    is_active: cast.is_active,
  };
}

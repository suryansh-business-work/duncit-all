import { z } from 'zod';
import { SLUG_KEY_PATTERN } from '@duncit/forms';

const isHttpUrl = (value: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export interface PodPlanFormValues {
  key: string;
  name: string;
  description: string;
  image_url: string;
  features: string[];
  price_label: string;
  sort_order: number;
  is_coming_soon: boolean;
  is_active: boolean;
}

export const podPlanFormSchema: z.ZodType<PodPlanFormValues, z.ZodTypeDef, unknown> = z.object({
  key: z
    .string()
    .trim()
    .max(40, 'Key must be 40 characters or fewer')
    .regex(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name must be 80 characters or fewer'),
  description: z.string().trim().max(500).default(''),
  image_url: z.string().trim().default('').refine(isHttpUrl, 'Image URL must be a valid http(s) URL'),
  features: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  price_label: z.string().trim().max(60).default(''),
  sort_order: z.coerce
    .number()
    .int('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(999, 'Sort order must be 999 or fewer'),
  is_coming_soon: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const podPlanFormDefaults: PodPlanFormValues = {
  key: '',
  name: '',
  description: '',
  image_url: '',
  features: [],
  price_label: '',
  sort_order: 0,
  is_coming_soon: false,
  is_active: true,
};

export function parsePodPlanFeatures(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function toPodPlanInput(values: PodPlanFormValues) {
  const cast = podPlanFormSchema.parse(values);
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

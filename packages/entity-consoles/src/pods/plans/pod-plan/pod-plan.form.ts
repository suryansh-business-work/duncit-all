import { z } from 'zod';
import { SLUG_KEY_PATTERN } from '@duncit/forms';
import { fallbackT, type Translate } from '@duncit/shell';

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

/** Built from the form's translator: a validation message is copy the admin
 * reads, so it follows their language like the rest of the dialog (rule 38). */
export const makePodPlanFormSchema = (t: Translate) =>
  z.object({
    key: z
      .string()
      .trim()
      .max(40, t('admin.podPlans.errKeyMax'))
      .regex(SLUG_KEY_PATTERN, t('admin.podPlans.errKeyPattern')),
    name: z
      .string()
      .trim()
      .min(1, t('admin.podPlans.errNameRequired'))
      .max(80, t('admin.podPlans.errNameMax')),
    description: z.string().trim().max(500).default(''),
    image_url: z.string().trim().default('').refine(isHttpUrl, t('admin.podPlans.errImageUrl')),
    features: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    price_label: z.string().trim().max(60).default(''),
    sort_order: z.coerce
      .number()
      .int(t('admin.podPlans.errSortWhole'))
      .min(0, t('admin.podPlans.errSortMin'))
      .max(999, t('admin.podPlans.errSortMax')),
    is_coming_soon: z.boolean().default(false),
    is_active: z.boolean().default(true),
  });

/** The schema outside React — `toPodPlanInput` and the form's own suite parse
 * with no tree around them, so this one reads the shipped English. */
export const podPlanFormSchema = makePodPlanFormSchema(fallbackT);

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

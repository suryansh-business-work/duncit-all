import * as yup from 'yup';

export type IconMode = 'ICON' | 'IMAGE';

export const categoryFormSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer')
    .required('Name is required'),
  iconMode: yup
    .mixed<IconMode>()
    .oneOf(['ICON', 'IMAGE'], 'Select a valid icon mode')
    .required('Icon mode is required'),
  icon: yup.string().trim().max(1000).default(''),
  description: yup.string().trim().max(2000).default(''),
  mediaText: yup.string().trim().max(4000).default(''),
  sort_order: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999)
    .default(0),
  is_active: yup.boolean().default(true),
});

export type CategoryFormValues = yup.InferType<typeof categoryFormSchema>;

export interface CategoryMediaItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
}

export function parseCategoryMedia(text: string): CategoryMediaItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url) => ({
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : ('IMAGE' as const),
      url,
    }));
}

export function toCategoryInput(values: CategoryFormValues) {
  const cast = categoryFormSchema.cast(values, { stripUnknown: true });
  return {
    name: cast.name,
    icon: cast.icon || null,
    description: cast.description || null,
    media: parseCategoryMedia(cast.mediaText),
    sort_order: Number(cast.sort_order) || 0,
    is_active: cast.is_active,
  };
}

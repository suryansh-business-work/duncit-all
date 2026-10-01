import { z } from 'zod';

export type IconMode = 'ICON' | 'IMAGE';

const wholeNumber = (message: string) => z.number().int(message);

export const categoryFormSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  iconMode: z.enum(['ICON', 'IMAGE'], {
    error: (issue) => (issue.input == null ? 'Icon mode is required' : 'Select a valid icon mode'),
  }),
  icon: z.string().trim().max(1000).default(''),
  description: z.string().trim().max(2000).default(''),
  mediaText: z.string().trim().max(4000).default(''),
  sort_order: wholeNumber('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999)
    .default(0),
  is_active: z.boolean().default(true),
  // SUB-category only. The dialog hides these on SUPER/CATEGORY and the server
  // rejects them there, so the defaults keep those levels valid.
  allow_co_hosts: z.boolean().default(false),
  max_co_hosts: wholeNumber('Co-host limit must be a whole number')
    .min(1, 'At least 1 co-host')
    .max(5, 'At most 5 co-hosts')
    .default(1),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

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

/**
 * `level` decides whether the co-host fields travel: the server rejects them on
 * anything but a SUB-category, so sending them from a SUPER/CATEGORY dialog
 * would turn a harmless save into a BAD_USER_INPUT.
 *
 * Normalises like the schema does (trim + defaults) without validating.
 */
export function toCategoryInput(values: z.input<typeof categoryFormSchema>, level?: string) {
  const base = {
    name: values.name.trim(),
    icon: (values.icon ?? '').trim() || null,
    description: (values.description ?? '').trim() || null,
    media: parseCategoryMedia(values.mediaText ?? ''),
    sort_order: Number(values.sort_order) || 0,
    is_active: values.is_active ?? true,
  };
  if (level !== 'SUB') return base;
  return {
    ...base,
    allow_co_hosts: values.allow_co_hosts ?? false,
    max_co_hosts: Number(values.max_co_hosts) || 1,
  };
}

import { z } from 'zod';
import type { WebsiteContentItem, WebsitePageType } from '../queries';

/** A URL, mailto:, or tel: link — or empty. Mirrors the old Yup `linkSchema`. */
const isValidLink = (value: string): boolean => {
  if (!value) return true;
  if (/^(mailto:|tel:)/i.test(value)) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const linkSchema = z
  .string()
  .trim()
  .refine(isValidLink, 'Use a valid URL, mailto, or tel link');

export const websiteContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(160, 'Title must be 160 characters or fewer'),
  slug: z.string().trim().max(180, 'Slug must be 180 characters or fewer'),
  summary: z.string().trim().max(500, 'Summary must be 500 characters or fewer'),
  body: z.string().max(50_000, 'Body is too long'),
  category: z.string().trim().max(80, 'Category must be 80 characters or fewer'),
  image_url: linkSchema,
  cta_label: z.string().trim().max(60, 'CTA label must be 60 characters or fewer'),
  cta_url: linkSchema,
  published_at: z.string().nullable(),
  is_published: z.boolean(),
  sort_order: z.coerce
    .number({ invalid_type_error: 'Sort order must be a number' })
    .int('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999, 'Sort order is too large'),
});

export type WebsiteContentFormValues = z.infer<typeof websiteContentSchema>;

/** Shape sent to the createWebsiteContent / updateWebsiteContent mutations. */
export interface WebsiteContentInput
  extends Omit<WebsiteContentFormValues, 'published_at' | 'slug'> {
  type: WebsitePageType;
  slug?: string;
  published_at: string | null;
}

export const blankValues = (): WebsiteContentFormValues => ({
  title: '',
  slug: '',
  summary: '',
  body: '',
  category: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  published_at: new Date().toISOString(),
  is_published: true,
  sort_order: 0,
});

export const toFormValues = (item: WebsiteContentItem): WebsiteContentFormValues => ({
  title: item.title ?? '',
  slug: item.slug ?? '',
  summary: item.summary ?? '',
  body: item.body ?? '',
  category: item.category ?? '',
  image_url: item.image_url ?? '',
  cta_label: item.cta_label ?? '',
  cta_url: item.cta_url ?? '',
  published_at: item.published_at ? new Date(item.published_at).toISOString() : '',
  is_published: item.is_published !== false,
  sort_order: item.sort_order ?? 0,
});

export const toContentInput = (
  values: WebsiteContentFormValues,
  type: WebsitePageType,
): WebsiteContentInput => ({
  type,
  title: values.title,
  slug: values.slug || undefined,
  summary: values.summary,
  body: values.body,
  category: values.category,
  image_url: values.image_url,
  cta_label: values.cta_label,
  cta_url: values.cta_url,
  published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
  is_published: values.is_published,
  sort_order: Number(values.sort_order) || 0,
});

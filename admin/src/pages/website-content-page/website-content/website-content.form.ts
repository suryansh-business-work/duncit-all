import * as yup from 'yup';
import { SLUG_KEY_PATTERN, validationRules } from '../../../forms/validation/rules';

export const WEBSITE_PAGE_TYPES = [
  'NEWSROOM',
  'BLOG',
  'GUIDE',
  'CASE_STUDY',
  'TEAM',
  'OTHER',
] as const;

export type WebsitePageType = (typeof WEBSITE_PAGE_TYPES)[number];

const optionalUrl = validationRules.optionalUrl;

export const websiteContentFormSchema = yup.object({
  type: yup
    .mixed<WebsitePageType>()
    .oneOf([...WEBSITE_PAGE_TYPES], 'Select a valid page type')
    .required('Page type is required'),
  sort_order: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999)
    .default(0),
  title: yup
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be 200 characters or fewer')
    .required('Title is required'),
  slug: yup
    .string()
    .trim()
    .default('')
    .test('slug', 'Slug may contain lowercase letters, digits, dashes and underscores', (value) => {
      if (!value) return true;
      return SLUG_KEY_PATTERN.test(value);
    }),
  category: yup.string().trim().max(80).default(''),
  published_at: yup
    .string()
    .default('')
    .test('valid-datetime', 'Published at must be a valid date', (value) => {
      if (!value) return true;
      return !Number.isNaN(new Date(value).getTime());
    }),
  summary: yup.string().trim().max(1000).default(''),
  body: yup.string().trim().max(50_000).default(''),
  image_url: optionalUrl('Image URL'),
  cta_label: yup.string().trim().max(60).default(''),
  cta_url: optionalUrl('CTA URL'),
  is_published: yup.boolean().default(false),
});

export type WebsiteContentFormValues = yup.InferType<typeof websiteContentFormSchema>;

export function autoSlug(title: string) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function toWebsiteContentInput(values: WebsiteContentFormValues) {
  const cast = websiteContentFormSchema.cast(values, { stripUnknown: true });
  return {
    type: cast.type,
    sort_order: Number(cast.sort_order) || 0,
    title: cast.title,
    slug: cast.slug || autoSlug(cast.title),
    category: cast.category || null,
    published_at: cast.published_at ? new Date(cast.published_at).toISOString() : null,
    summary: cast.summary || null,
    body: cast.body || null,
    image_url: cast.image_url || null,
    cta_label: cast.cta_label || null,
    cta_url: cast.cta_url || null,
    is_published: cast.is_published,
  };
}

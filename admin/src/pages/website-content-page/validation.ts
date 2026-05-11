import * as yup from 'yup';

const linkSchema = yup.string().trim().test('link', 'Use a valid URL, mailto, or tel link', (value) => {
  if (!value) return true;
  if (/^(mailto:|tel:)/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
});

export const websiteContentSchema = yup.object({
  type: yup.string().oneOf(['CAREERS', 'NEWSROOM', 'BLOG']).required(),
  title: yup.string().trim().required('Title is required').max(160),
  slug: yup.string().trim().max(180),
  summary: yup.string().trim().max(500),
  body: yup.string(),
  category: yup.string().trim().max(80),
  image_url: linkSchema,
  cta_label: yup.string().trim().max(60),
  cta_url: linkSchema,
  published_at: yup.string().nullable(),
  is_published: yup.boolean().required(),
  sort_order: yup.number().integer().min(0).required(),
});
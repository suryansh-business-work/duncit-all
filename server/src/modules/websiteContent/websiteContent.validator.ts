import * as yup from 'yup';

const urlOrEmpty = yup
  .string()
  .trim()
  .test('url-or-empty', 'Must be a URL, mailto, or tel link', (value) => {
    if (!value) return true;
    if (/^(mailto:|tel:)/i.test(value)) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  });

export const websiteContentInputSchema = yup.object({
  type: yup.string().oneOf(['CAREERS', 'NEWSROOM', 'BLOG']).required(),
  title: yup.string().trim().required('Title is required').max(160),
  slug: yup.string().trim().max(180),
  summary: yup.string().trim().max(500).default(''),
  body: yup.string().default(''),
  category: yup.string().trim().max(80).default(''),
  image_url: urlOrEmpty.default(''),
  cta_label: yup.string().trim().max(60).default(''),
  cta_url: urlOrEmpty.default(''),
  published_at: yup.string().nullable().default(null),
  is_published: yup.boolean().default(true),
  sort_order: yup.number().integer().min(0).default(0),
});
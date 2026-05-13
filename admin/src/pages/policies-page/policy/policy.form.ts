import * as yup from 'yup';
import { SLUG_KEY_PATTERN } from '../../../forms/validation/rules';

export const policyFormSchema = yup.object({
  slug: yup
    .string()
    .trim()
    .matches(SLUG_KEY_PATTERN, 'Slug may contain lowercase letters, digits, dashes and underscores')
    .max(80, 'Slug must be 80 characters or fewer')
    .required('Slug is required'),
  title: yup
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(160, 'Title must be 160 characters or fewer')
    .required('Title is required'),
  body: yup
    .string()
    .trim()
    .min(10, 'Body must be at least 10 characters')
    .required('Body is required'),
  sort_order: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999)
    .default(0),
  is_published: yup.boolean().default(false),
});

export type PolicyFormValues = yup.InferType<typeof policyFormSchema>;

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').trim();
}

export function toPolicyInput(values: PolicyFormValues) {
  const cast = policyFormSchema.cast(values, { stripUnknown: true });
  if (stripHtml(cast.body).length < 10) {
    throw new yup.ValidationError('Body must contain at least 10 characters of text', cast.body, 'body');
  }
  return {
    slug: cast.slug,
    title: cast.title,
    body: cast.body,
    sort_order: Number(cast.sort_order) || 0,
    is_published: cast.is_published,
  };
}

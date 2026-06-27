import * as yup from 'yup';

const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export const emailTemplateCreateSchema = yup.object({
  slug: yup
    .string()
    .trim()
    .matches(SLUG_PATTERN, 'Slug may contain lowercase letters, digits, dashes and underscores')
    .max(80, 'Slug must be 80 characters or fewer')
    .required('Slug is required'),
  name: yup
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer')
    .required('Name is required'),
  subject: yup
    .string()
    .trim()
    .min(2, 'Subject must be at least 2 characters')
    .max(300, 'Subject must be 300 characters or fewer')
    .required('Subject is required'),
});

export type EmailTemplateCreateValues = yup.InferType<typeof emailTemplateCreateSchema>;

export function slugify(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function toCreateTemplateInput(values: EmailTemplateCreateValues) {
  const cast = emailTemplateCreateSchema.cast(values, { stripUnknown: true });
  return {
    slug: cast.slug,
    name: cast.name,
    subject: cast.subject,
  };
}

import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export const emailTemplateCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(80, 'Slug must be 80 characters or fewer')
    .regex(SLUG_PATTERN, 'Slug may contain lowercase letters, digits, dashes and underscores'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer'),
  subject: z
    .string()
    .trim()
    .min(2, 'Subject must be at least 2 characters')
    .max(300, 'Subject must be 300 characters or fewer'),
});

export type EmailTemplateCreateValues = z.infer<typeof emailTemplateCreateSchema>;

export function slugify(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function toCreateTemplateInput(values: EmailTemplateCreateValues) {
  const parsed = emailTemplateCreateSchema.parse(values);
  return {
    slug: parsed.slug,
    name: parsed.name,
    subject: parsed.subject,
  };
}

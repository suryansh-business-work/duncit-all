import { z } from 'zod';
import { SLUG_KEY_PATTERN } from '@duncit/forms';

export const roleFormSchema = z.object({
  key: z
    .string({ error: 'Key is required' })
    .trim()
    .regex(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores')
    .max(60, 'Key must be 60 characters or fewer'),
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer'),
  description: z.string().trim().max(500).default(''),
  permissions: z.array(z.string().trim().min(1)).default([]),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

/** Normalises like the schema does (trim + defaults) without validating. */
export function toRoleInput(values: z.input<typeof roleFormSchema>) {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    description: (values.description ?? '').trim() || null,
    permissions: (values.permissions ?? []).map((permission) => permission.trim()),
  };
}

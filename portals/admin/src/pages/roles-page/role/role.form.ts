import * as yup from 'yup';
import { SLUG_KEY_PATTERN } from '../../../forms/validation/rules';

export const roleFormSchema = yup.object({
  key: yup
    .string()
    .trim()
    .matches(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores')
    .max(60, 'Key must be 60 characters or fewer')
    .required('Key is required'),
  name: yup
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer')
    .required('Name is required'),
  description: yup.string().trim().max(500).default(''),
  permissions: yup.array(yup.string().trim().required()).default([]),
});

export type RoleFormValues = yup.InferType<typeof roleFormSchema>;

export function toRoleInput(values: RoleFormValues) {
  const cast = roleFormSchema.cast(values, { stripUnknown: true });
  return {
    key: cast.key,
    name: cast.name,
    description: cast.description || null,
    permissions: cast.permissions,
  };
}

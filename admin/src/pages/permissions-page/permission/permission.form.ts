import * as yup from 'yup';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export const permissionFormSchema = yup.object({
  resource_key: yup
    .string()
    .trim()
    .matches(KEY_PATTERN, 'Resource key must start with a lowercase letter and contain only lowercase letters, digits and underscores')
    .max(60, 'Resource key must be 60 characters or fewer')
    .required('Resource is required'),
  action_key: yup
    .string()
    .trim()
    .matches(KEY_PATTERN, 'Action key must start with a lowercase letter and contain only lowercase letters, digits and underscores')
    .max(60, 'Action key must be 60 characters or fewer')
    .required('Action is required'),
  description: yup.string().trim().max(500).default(''),
});

export type PermissionFormValues = yup.InferType<typeof permissionFormSchema>;

export function toPermissionInput(values: PermissionFormValues) {
  const cast = permissionFormSchema.cast(values, { stripUnknown: true });
  return {
    resource_key: cast.resource_key,
    action_key: cast.action_key,
    description: cast.description || null,
  };
}

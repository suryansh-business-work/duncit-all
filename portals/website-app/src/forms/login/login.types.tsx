import { z } from 'zod';
import { validationRules } from '../validation/rules';

/**
 * Login contract — RHF + Zod (migrated from Formik + Yup). Email is trimmed and
 * lower-cased; password requires at least 8 characters.
 */
export const loginSchema = z.object({
  email: validationRules.email('Email'),
  password: validationRules.password('Password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginInitialValues: LoginFormValues = {
  email: '',
  password: '',
};

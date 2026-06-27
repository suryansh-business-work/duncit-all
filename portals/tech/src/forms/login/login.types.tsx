import { z } from 'zod';
import { validationRules } from '../validation/rules';

/**
 * Login contract — RHF + Zod (migrated from Formik + Yup). Email + 8-char
 * password, using the shared reusable field rules.
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

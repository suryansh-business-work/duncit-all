import { z } from 'zod';
import { zodRules } from '../validation/zodRules';

/**
 * Login contract — RHF + Zod (migrated from Formik + Yup). Email + 8-char
 * password, mirroring the shared finance validation rules.
 */
export const loginSchema = z.object({
  email: zodRules.email('Email'),
  password: zodRules.password('Password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginInitialValues: LoginFormValues = {
  email: '',
  password: '',
};

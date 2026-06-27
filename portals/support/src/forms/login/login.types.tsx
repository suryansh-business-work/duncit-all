import { z } from 'zod';
import { validationRules } from '../validation/rules';

export const loginSchema = z.object({
  email: validationRules.email('Email'),
  password: validationRules.password('Password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginInitialValues: LoginFormValues = {
  email: '',
  password: '',
};

import { z } from 'zod';
import { zodRules } from '../validation/zodRules';

export const loginSchema = z.object({
  email: zodRules.email('Email'),
  password: zodRules.password('Password'),
});

export interface LoginFormValues {
  email: string;
  password: string;
}

export const loginInitialValues: LoginFormValues = {
  email: '',
  password: '',
};

import * as yup from 'yup';
import { validationRules } from '../validation/rules';

export const loginSchema = yup.object({
  email: validationRules.email('Email'),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
});

export interface LoginPayload {
  email: string;
  password: string;
}

export function toLoginPayload(values: { email: string; password: string }): LoginPayload {
  const cast = loginSchema.cast(values, { stripUnknown: true });
  return { email: cast.email, password: cast.password };
}

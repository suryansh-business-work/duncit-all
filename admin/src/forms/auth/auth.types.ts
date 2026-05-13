import type * as yup from 'yup';
import type { loginSchema } from './auth.form';

export type LoginFormValues = yup.InferType<typeof loginSchema>;

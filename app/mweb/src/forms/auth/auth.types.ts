import type * as yup from 'yup';
import type { googleSignupSchema } from './auth.form';

export type GoogleSignupFormValues = yup.InferType<typeof googleSignupSchema>;

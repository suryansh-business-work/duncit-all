import type { z } from 'zod';
import type { googleSignupSchema } from './auth.form';

export type GoogleSignupFormValues = z.infer<typeof googleSignupSchema>;

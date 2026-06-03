import { z } from 'zod';

/**
 * Login contract — RHF + Zod (migrated from Formik + Yup). Mirrors the server
 * login validation and the mobile app's `loginSchema`: email + 8-char password.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(254),
  password: z.string().min(8, 'Min 8 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginDefaults: LoginFormValues = { email: '', password: '' };

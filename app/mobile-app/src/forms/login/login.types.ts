import { z } from 'zod';

/** Login contract — identical to mWeb: email + password, same server. */
export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const loginDefaults: LoginFormValues = {
  email: '',
  password: '',
};

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email')
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required').min(8, 'Min 8 characters'),
});

export interface LoginPayload {
  email: string;
  password: string;
}

export function toLoginPayload(values: { email: string; password: string }): LoginPayload {
  const cast = loginSchema.parse(values);
  return { email: cast.email, password: cast.password };
}

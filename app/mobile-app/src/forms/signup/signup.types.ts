import { z } from 'zod';

const currentYear = new Date().getFullYear();

/**
 * Simplified signup contract: Name, Birth Year, Email, Password, Confirm
 * Password. Mirrors the mWeb signup so both apps validate identical rules.
 */
export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name is too long'),
    birthYear: z
      .string()
      .regex(/^\d{4}$/, 'Enter a 4-digit year')
      .refine((v) => {
        const year = Number(v);
        return year >= 1900 && year <= currentYear;
      }, 'Enter a valid year'),
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(8, 'Min 8 characters').max(128, 'Password is too long'),
    confirmPassword: z.string().min(8, 'Min 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const signupDefaults: SignupFormValues = {
  name: '',
  birthYear: '',
  email: '',
  password: '',
  confirmPassword: '',
};

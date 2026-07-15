import { z } from 'zod';

/** Admin-configured signup birth-year bound defaults (Admin > Settings). */
export const DEFAULT_MIN_BIRTH_YEAR = 1940;
export const DEFAULT_MAX_BIRTH_YEAR = 2012;

/**
 * Simplified signup contract: Name, Birth Year, Email, Password, Confirm
 * Password. Mirrors the mWeb signup so both apps validate identical rules. The
 * birth-year bounds are admin-configurable, so the schema is built per-render
 * from the fetched min/max (see SignupForm).
 */
export function makeSignupSchema(
  minYear: number = DEFAULT_MIN_BIRTH_YEAR,
  maxYear: number = DEFAULT_MAX_BIRTH_YEAR,
) {
  return z
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
          return year >= minYear && year <= maxYear;
        }, `Enter a year between ${minYear} and ${maxYear}`),
      email: z.string().trim().email('Enter a valid email'),
      password: z.string().min(8, 'Min 8 characters').max(128, 'Password is too long'),
      confirmPassword: z.string().min(8, 'Min 8 characters'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

/** The default-bounds schema — for callers that don't need dynamic bounds. */
export const signupSchema = makeSignupSchema();

export type SignupFormValues = z.infer<typeof signupSchema>;

export const signupDefaults: SignupFormValues = {
  name: '',
  birthYear: '',
  email: '',
  password: '',
  confirmPassword: '',
};

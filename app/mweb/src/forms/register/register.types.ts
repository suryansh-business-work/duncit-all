import { z } from 'zod';

export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;

/** Admin-configured signup birth-year bound defaults (Admin > Settings). */
export const DEFAULT_MIN_BIRTH_YEAR = 1940;
export const DEFAULT_MAX_BIRTH_YEAR = 2012;

/**
 * Register contract — RHF + Zod (migrated from Formik + Yup). Mirrors the native
 * signup: name, email, 8-char password with confirmation, and a birth year
 * within the admin-configurable [min, max] bounds (so the schema is built
 * per-render from the fetched bounds — see RegisterForm).
 */
export function makeRegisterSchema(
  minYear: number = DEFAULT_MIN_BIRTH_YEAR,
  maxYear: number = DEFAULT_MAX_BIRTH_YEAR,
) {
  // Birth year as a 'YYYY-01-01' string (from the year picker).
  const dobString = z
    .string()
    .min(1, 'Birth year is required')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Birth year is required')
    .refine((v) => {
      const year = new Date(v).getFullYear();
      return year >= minYear && year <= maxYear;
    }, `Enter a year between ${minYear} and ${maxYear}`);

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Name is required')
        .regex(
          PERSON_NAME_PATTERN,
          'Name can use letters, spaces, apostrophes, periods and hyphens only',
        ),
      email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(254),
      password: z.string().min(8, 'Min 8 characters').max(128),
      confirmPassword: z.string().min(1, 'Please confirm your password'),
      dob: dobString,
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

/** The default-bounds schema — for callers that don't need dynamic bounds. */
export const registerSchema = makeRegisterSchema();

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const registerDefaults: RegisterFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  dob: '',
};

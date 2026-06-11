import { z } from 'zod';

export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;

/** Birth year as a 'YYYY-01-01' string (from the year picker). Must parse to a
 * past date and clear the 13-year minimum-age gate. */
const dobString = z
  .string()
  .min(1, 'Birth year is required')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Birth year is required')
  .refine((v) => new Date(v) <= new Date(), 'Birth year must be in the past')
  .refine((v) => {
    const min = new Date();
    min.setFullYear(min.getFullYear() - 13);
    return new Date(v) <= min;
  }, 'You must be at least 13 years old');

/**
 * Register contract — RHF + Zod (migrated from Formik + Yup). Mirrors the
 * server register validation: name, email, 8-char password with confirmation,
 * and a 13+ birth year.
 */
export const registerSchema = z
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

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const registerDefaults: RegisterFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  dob: '',
};

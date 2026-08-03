import { z } from 'zod';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, dobMinAgeMessage, isEligibleDob } from '@duncit/datetime';

export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;

/**
 * Register contract — RHF + Zod (migrated from Formik + Yup). Mirrors the native
 * signup: name, email, 8-char password with confirmation, and a date of birth
 * that makes the applicant at least 18 today.
 *
 * The age rule lives in @duncit/datetime so signup, the profile editor and the
 * server all gate on the same calendar comparison. It replaced an
 * admin-configured birth-YEAR range, which could only ever approximate an age:
 * a year picker passes anyone born in the cut-off year, including someone whose
 * 18th birthday is still months away.
 */
export function makeRegisterSchema(minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS) {
  const dobString = z
    .string()
    .min(1, 'Date of birth is required')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Enter a valid date of birth')
    .refine((v) => isEligibleDob(v, minAge), dobMinAgeMessage(minAge));

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

export const registerSchema = makeRegisterSchema();

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const registerDefaults: RegisterFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  dob: '',
};

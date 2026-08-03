import { z } from 'zod';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, dobMinAgeMessage, isEligibleDob } from '@duncit/datetime';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Simplified signup contract: Name, Date of Birth, Email, Password, Confirm
 * Password. Mirrors the mWeb signup so both apps validate identical rules.
 *
 * The date of birth must make the applicant at least 18 today. It replaced an
 * admin-configured birth-YEAR range, which could only ever approximate an age:
 * a year picker passes anyone born in the cut-off year, including someone whose
 * 18th birthday is still months away.
 */
export function makeSignupSchema(minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name is too long'),
      dob: z
        .string()
        .trim()
        .min(1, 'Date of birth is required')
        .refine((v) => DOB_PATTERN.test(v), 'Use the format YYYY-MM-DD')
        .refine((v) => isEligibleDob(v, minAge), dobMinAgeMessage(minAge)),
      email: z.string().trim().email('Enter a valid email'),
      password: z.string().min(8, 'Min 8 characters').max(128, 'Password is too long'),
      confirmPassword: z.string().min(8, 'Min 8 characters'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

export const signupSchema = makeSignupSchema();

export type SignupFormValues = z.infer<typeof signupSchema>;

export const signupDefaults: SignupFormValues = {
  name: '',
  dob: '',
  email: '',
  password: '',
  confirmPassword: '',
};

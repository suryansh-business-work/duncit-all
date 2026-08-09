import { z } from 'zod';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, isEligibleDob } from '@duncit/datetime';

import { fallbackT, type Translate } from '@/i18n/fallback';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Simplified signup contract: Name, Date of Birth, Email, Password, Confirm
 * Password. Mirrors the mWeb signup so both apps validate identical rules.
 *
 * The date of birth must make the applicant at least 18 today. It replaced an
 * admin-configured birth-YEAR range, which could only ever approximate an age:
 * a year picker passes anyone born in the cut-off year, including someone whose
 * 18th birthday is still months away. The message it fails with is copy, so it
 * comes from the shared catalogue rather than the package's English constant.
 */
export function makeSignupSchema(
  minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  t: Translate = fallbackT,
) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t('mweb.signup.validation.nameMin'))
        .max(80, t('mweb.signup.validation.nameTooLong')),
      dob: z
        .string()
        .trim()
        .min(1, t('mweb.signup.validation.dobRequired'))
        .refine((v) => DOB_PATTERN.test(v), t('mweb.signup.validation.dobFormat'))
        .refine(
          (v) => isEligibleDob(v, minAge),
          t('mweb.signup.validation.dobMinAge', { vars: { years: minAge } }),
        ),
      email: z.string().trim().email(t('mweb.auth.validation.emailInvalid')),
      password: z
        .string()
        .min(8, t('mweb.auth.validation.passwordMin'))
        .max(128, t('mweb.auth.validation.passwordTooLong')),
      confirmPassword: z.string().min(8, t('mweb.auth.validation.passwordMin')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('mweb.auth.validation.passwordsMismatch'),
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

import { z } from 'zod';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, isEligibleDob } from '@duncit/datetime';
import { fallbackT, type Translate } from '../../i18n/fallback';

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
 * 18th birthday is still months away. The message it fails with is copy, so it
 * comes from the shared catalogue rather than the package's English constant.
 */
export function makeRegisterSchema(
  minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  t: Translate = fallbackT,
) {
  const dobString = z
    .string()
    .min(1, t('mweb.signup.validation.dobRequired'))
    .refine((v) => !Number.isNaN(new Date(v).getTime()), t('mweb.signup.validation.dobInvalid'))
    .refine(
      (v) => isEligibleDob(v, minAge),
      t('mweb.signup.validation.dobMinAge', { vars: { years: minAge } }),
    );

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t('mweb.signup.validation.nameRequired'))
        .regex(PERSON_NAME_PATTERN, t('mweb.signup.validation.namePattern')),
      email: z
        .string()
        .trim()
        .min(1, t('mweb.auth.validation.emailRequired'))
        .email(t('mweb.auth.validation.emailInvalid'))
        .max(254),
      password: z.string().min(8, t('mweb.auth.validation.passwordMin')).max(128),
      confirmPassword: z.string().min(1, t('mweb.signup.validation.confirmRequired')),
      dob: dobString,
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t('mweb.auth.validation.passwordsMismatch'),
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

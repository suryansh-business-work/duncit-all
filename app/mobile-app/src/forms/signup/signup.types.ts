import { z } from 'zod';
import {
  DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  FALLBACK_DATE_FORMAT,
  isEligibleDob,
  patternPlaceholder,
} from '@duncit/datetime';
import { PERSON_NAME, REFERRAL_CODE } from '@duncit/regex';

import { fallbackT, type Translate } from '@/i18n/fallback';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Used only by the module-level schema built before settings land. */
const FALLBACK_DATE_PLACEHOLDER = patternPlaceholder(FALLBACK_DATE_FORMAT);

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
  requiredPolicyIds: readonly string[] = [],
  /** How the date box asks to be typed, from the admin's date pattern. */
  datePlaceholder: string = FALLBACK_DATE_PLACEHOLDER,
) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t('mweb.signup.validation.nameMin'))
        .max(80, t('mweb.signup.validation.nameTooLong'))
        .regex(PERSON_NAME, t('mweb.signup.validation.namePattern')),
      dob: z
        .string()
        .trim()
        .min(1, t('mweb.signup.validation.dobRequired'))
        .refine(
          (v) => DOB_PATTERN.test(v),
          t('mweb.signup.validation.dobFormat', { vars: { format: datePlaceholder } }),
        )
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
      /*
        Optional, and the ONLY place a code can be typed on this surface — the
        box is gone from Refer & Earn, because a code is redeemed once and this
        is the moment it happens. The shape is checked here so a typo is an
        inline hint; whether the code actually exists is the server's call, made
        before the account is created.
      */
      referralCode: z
        .string()
        .trim()
        .refine(
          (v) => v === '' || REFERRAL_CODE.test(v.toUpperCase()),
          t('mweb.referral.validation.codePattern'),
        ),
      /*
        The policies ticked in the acceptance sheet, checked against the list
        the server says gates signup rather than against a bare "I agree" flag —
        a policy Legal added while this form was open is then genuinely missing
        rather than covered by a tick made before it existed.

        Like `assertEligibleDob`, the real gate is server-side: `register`
        re-verifies this list before the account is created, because tick boxes
        shape a form and cannot stop a hand-rolled mutation.
      */
      acceptedPolicyIds: z
        .array(z.string())
        .refine(
          (ids) => requiredPolicyIds.every((id) => ids.includes(id)),
          t('policyAcceptance.required'),
        ),
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
  referralCode: '',
  acceptedPolicyIds: [],
};

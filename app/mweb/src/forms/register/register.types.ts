import { z } from 'zod';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, isEligibleDob } from '@duncit/datetime';
import { PERSON_NAME, REFERRAL_CODE } from '@duncit/regex';
import { fallbackT, type Translate } from '../../i18n/fallback';

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
  requiredPolicyIds: readonly string[] = [],
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
        .max(60, t('mweb.signup.validation.nameTooLong'))
        .regex(PERSON_NAME, t('mweb.signup.validation.namePattern')),
      email: z
        .string()
        .trim()
        .min(1, t('mweb.auth.validation.emailRequired'))
        .email(t('mweb.auth.validation.emailInvalid'))
        .max(254),
      password: z.string().min(8, t('mweb.auth.validation.passwordMin')).max(128),
      confirmPassword: z.string().min(1, t('mweb.signup.validation.confirmRequired')),
      dob: dobString,
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
        Every policy the person ticked in the acceptance dialog, and the reason
        the signup button is dead until they have. It is a real validation rule
        rather than a disabled prop so the form says WHY, in the reader's
        language, the same way a missing name does. The list the rule checks
        against is the live `signupPolicies` answer, which is also what the
        server re-verifies before it creates anything.
      */
      acceptedPolicyIds: z.array(z.string()),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t('mweb.auth.validation.passwordsMismatch'),
      path: ['confirmPassword'],
    })
    .refine(
      (values) => {
        const ticked = new Set(values.acceptedPolicyIds);
        return requiredPolicyIds.every((id) => ticked.has(id));
      },
      { message: t('policyAcceptance.required'), path: ['acceptedPolicyIds'] },
    );
}

export const registerSchema = makeRegisterSchema();

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const registerDefaults: RegisterFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  dob: '',
  referralCode: '',
  acceptedPolicyIds: [],
};

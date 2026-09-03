/**
 * Joining Duncit — the ONE contract both signup surfaces validate against.
 *
 * mWeb and the native app had written this twice and had already drifted on
 * three rules that decide whether a real person can join:
 *
 *  - a NAME had to be 1–60 characters on mWeb and 2–80 on the app, so `Al`
 *    passed one and `A` passed neither, and a long Indian full name passed the
 *    app and was refused by mWeb;
 *  - CONFIRM PASSWORD demanded 8 characters on the app, which reported "Min 8
 *    characters" under a box whose real problem was that it did not match;
 *  - EMAIL was only shape-checked on the app, so a blank box said "Enter a
 *    valid email" where mWeb said "Email is required".
 *
 * One copy, one answer. The messages are copy, so every rule takes them from
 * the shared catalogue (rule 38) and each surface binds this factory to its own
 * bundled English.
 */
import { z } from 'zod';
import { BIRTH_YEAR, DIAL_CODE, EMAIL, PERSON_NAME, PHONE_INTL, REFERRAL_CODE } from '@duncit/regex';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, isEligibleBirthYear } from '@duncit/datetime';

import type { Translate } from './translate';

/**
 * The WhatsApp row every signup door collects — the number, its dial code, and
 * whether it is also the mobile number.
 *
 * Spelled once because two doors ask for it: the email form asks it as step
 * two, and Google — which hands back a finished account with no form attached —
 * asks it on a step of its own. A second copy would drift on exactly the rules
 * that decide whether a real number is accepted (rule 40).
 *
 * Both halves are checked here only for SHAPE — the digits without a dial code,
 * matching the server's own `phoneRegex`, so a number the form accepts is a
 * number the mutation accepts. Whether it is already on another account is the
 * server's answer: it holds the lookup, and a client-side check would race it.
 */
function whatsappNumberShape(t: Translate) {
  return {
    phoneExtension: z
      .string()
      .trim()
      .min(1, t('mweb.signup.validation.codeRequired'))
      .regex(DIAL_CODE, t('mweb.signup.validation.codeInvalid')),
    phoneNumber: z
      .string()
      .trim()
      .min(1, t('mweb.signup.validation.phoneRequired'))
      .regex(PHONE_INTL, t('mweb.signup.validation.phoneInvalid')),
    /*
      Ticked, the number is written to the profile phone as well as to WhatsApp.
      Unticked, the profile phone is left BLANK — the person is saying the two
      numbers differ, and guessing the mobile from the WhatsApp one would put a
      number they never gave us on their account.
    */
    whatsappIsMobile: z.boolean(),
  };
}

/**
 * The Google door's WhatsApp step: the same row, on its own.
 *
 * `signupWithGoogle` returns a finished account, so this is asked afterwards —
 * which is also the only moment the code can be requested, since
 * `requestWhatsAppOtp` authenticates its caller.
 *
 * This is the ONE public spelling of the row: `makeSignupSchema` spreads its
 * `.shape` rather than calling the shape builder beside it, so there is no way
 * to change the row for one door and not the other.
 */
export function makeWhatsappNumberSchema(t: Translate) {
  return z.object(whatsappNumberShape(t));
}

export type WhatsappNumberValues = z.infer<ReturnType<typeof makeWhatsappNumberSchema>>;

export const whatsappNumberDefaults: WhatsappNumberValues = {
  phoneExtension: '+91',
  phoneNumber: '',
  whatsappIsMobile: true,
};

export function makeSignupSchema(
  t: Translate,
  minAge: number = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  requiredPolicyIds: readonly string[] = [],
) {
  return z
    .object({
      /*
        Two length rules on purpose: the first reports an EMPTY box as required,
        the second reports a one-letter name as too short. Zod stops at the
        first failure, so each says the thing that is actually wrong.
      */
      name: z
        .string()
        .trim()
        .min(1, t('mweb.signup.validation.nameRequired'))
        .min(2, t('mweb.signup.validation.nameMin'))
        .max(80, t('mweb.signup.validation.nameTooLong'))
        .regex(PERSON_NAME, t('mweb.signup.validation.namePattern')),
      /*
        A birth YEAR, not a date — the one part of a birthday people type
        without hesitating. The shape is BIRTH_YEAR from @duncit/regex; whether
        it is old enough is @duncit/datetime's calendar question, which the
        server re-asks against the January 1 the year is stored as.
      */
      dobYear: z
        .string()
        .trim()
        .min(1, t('mweb.signup.validation.dobYearRequired'))
        .regex(BIRTH_YEAR, t('mweb.signup.validation.dobYearInvalid'))
        .refine(
          (v) => isEligibleBirthYear(v, minAge),
          t('mweb.signup.validation.dobMinAge', { vars: { years: minAge } }),
        ),
      email: z
        .string()
        .trim()
        .min(1, t('mweb.auth.validation.emailRequired'))
        .refine((v) => EMAIL.test(v), t('mweb.auth.validation.emailInvalid'))
        .max(254),
      // The WhatsApp number, its dial code and the "same as my mobile" answer —
      // the Google door's whole schema, spread in as this form's step two.
      ...makeWhatsappNumberSchema(t).shape,
      password: z
        .string()
        .min(8, t('mweb.auth.validation.passwordMin'))
        .max(128, t('mweb.auth.validation.passwordTooLong')),
      /*
        Only "did you fill it in" here. Whether it MATCHES is the refine below,
        and a length rule on this box reports "Min 8 characters" under a field
        whose real problem is that it differs from the one above it.
      */
      confirmPassword: z.string().min(1, t('mweb.signup.validation.confirmRequired')),
      /*
        Optional, and the ONLY place a code can be typed on either surface — the
        box is gone from Refer & Earn, because a code is redeemed once and this
        is the moment it happens. The shape is checked here so a typo is an
        inline hint; whether the code exists is the server's call, made before
        the account is created.
      */
      referralCode: z
        .string()
        .trim()
        .refine(
          (v) => v === '' || REFERRAL_CODE.test(v.toUpperCase()),
          t('mweb.referral.validation.codePattern'),
        ),
      /*
        The policies ticked in the acceptance step, checked against the list the
        server says gates signup rather than a bare "I agree" flag — a policy
        Legal added while this form was open is then genuinely missing.

        The real gate is server-side: `register` re-verifies this list before
        the account exists, because tick boxes shape a form and cannot stop a
        hand-rolled mutation.
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

export type SignupFormValues = z.infer<ReturnType<typeof makeSignupSchema>>;

export const signupDefaults: SignupFormValues = {
  name: '',
  dobYear: '',
  email: '',
  // Same default dial as every other phone row in both apps — India is the
  // market, and the box is a searchable list for everyone else.
  phoneExtension: '+91',
  phoneNumber: '',
  whatsappIsMobile: true,
  password: '',
  confirmPassword: '',
  referralCode: '',
  acceptedPolicyIds: [],
};

import { z } from 'zod';
import { phoneRegex, extRegex, personNameRegex } from '@modules/access/user/user.validator';
import {
  bool,
  date,
  email,
  filled,
  matches,
  maxLen,
  minLen,
  notAfter,
  obj,
  shape,
  str,
} from '@utils/zod-fields';

/** The latest date of birth a signup accepts — fixed when the server boots. */
const BOOTED_AT = new Date();

const CHANNELS = ['EMAIL', 'PHONE'] as const;

const otpCode = (message: string) => str(z.string().check(matches(/^\d{6}$/, message), filled()), { required: true });
const password = () => str(z.string().check(minLen(8), maxLen(100), filled()), { required: true });
const optionalText = () => str(z.string().optional());
const whatsappToken = () => str(z.string().check(minLen(10), maxLen(200), filled()), { required: true });
const phoneNumber = () => str(z.string().check(matches(phoneRegex, 'Invalid phone'), filled()), { required: true });
const phoneExtension = () =>
  str(z.string().check(matches(extRegex, 'Invalid extension'), filled()), { required: true });
const portalKey = () => str(z.string().check(maxLen(64)).optional());
const requiredEmail = () => str(z.string().check(email(), filled()), { required: true });
const dateOfBirth = () =>
  date(z.date().check(notAfter(BOOTED_AT, 'DOB must be in the past')), { required: true });

const registerNames = {
  // Names are shape-checked, not just length-checked: the single "Name" box is
  // split on whitespace, so anything the client let through became a surname.
  first_name: str(
    z.string().check(minLen(1), maxLen(60), matches(personNameRegex, 'Invalid first name'), filled()),
    { required: true }
  ),
  // last_name is optional: the simplified signup collects a single "Name" that
  // may be a single word, so the surname can be empty.
  last_name: str(
    z
      .string()
      .check(
        minLen(1),
        maxLen(60),
        matches(personNameRegex, { message: 'Invalid last name', excludeEmptyString: true })
      )
      .optional()
  ),
};

export const registerSchema = obj(
  shape({
    ...registerNames,
    email: requiredEmail(),
    // Phone is collected at signup again, and required: it is the second thing an
    // account is identified by, and the unique index on it only means anything if
    // every account created through this door actually carries one.
    phone_number: phoneNumber(),
    phone_extension: phoneExtension(),
    // The number is the WhatsApp one; this says whether it is the mobile number
    // too. Defaulted rather than required, so every shipped build that predates
    // the tick box keeps writing the phone exactly as it always did.
    whatsapp_is_mobile: bool(z.boolean(), { default: true }),
    // The proof that the number above answered, minted by verifySignupWhatsAppOtp
    // and required: an account is not created for a number nobody has answered on.
    whatsapp_token: whatsappToken(),
    password: password(),
    dob: dateOfBirth(),
    city: optionalText(),
    zone: optionalText(),
  })
);

/*
  Forgotten-password recovery, in three steps.

  The destination is validated per channel rather than "whatever was sent": a
  PHONE request with only an email would otherwise reach the OTP service, which
  would refuse it there with a message about a country code nobody was asked
  for. `when` is what keeps one input honest about two shapes.
*/
const passwordResetLookupShape = {
  channel: str(z.enum(CHANNELS), { oneOf: CHANNELS, required: true }),
  email: optionalText(),
  phone_extension: optionalText(),
  phone_number: optionalText(),
};

const byChannel = (channel: (typeof CHANNELS)[number], schema: z.ZodType) => (parent: Record<string, unknown>) =>
  parent.channel === channel ? schema : undefined;

const lookupWhen = {
  email: byChannel('EMAIL', requiredEmail()),
  phone_extension: byChannel('PHONE', phoneExtension()),
  phone_number: byChannel('PHONE', phoneNumber()),
};

export const loginSchema = obj(
  shape(
    {
      // The SAME per-channel destination rules the recovery and OTP doors validate,
      // spelled once above and spread here (rule 34): what counts as a phone number
      // cannot be allowed to differ between the door you sign in through and the
      // door you recover through. `channel` defaults to EMAIL so every client that
      // predates the phone option keeps working untouched.
      ...passwordResetLookupShape,
      // Overrides the spread's REQUIRED channel. Recovery has always sent one;
      // this door has not, and every portal and shipped app build still posts a
      // bare { email, password } — defaulting keeps all of them working, and the
      // per-channel rules above then read EMAIL and require the address exactly as
      // they did before.
      channel: str(z.enum(CHANNELS), { oneOf: CHANNELS, default: 'EMAIL' }),
      password: str(z.string().check(minLen(8), filled()), { required: true }),
      // Which portal the login request comes from (appConfig.key). Optional —
      // consumer apps omit it; consoles send it so access can be enforced.
      portal_key: portalKey(),
    },
    { when: lookupWhen }
  )
);

export const requestPasswordResetSchema = obj(shape({ email: requiredEmail() }));

export const passwordResetLookupSchema = obj(shape(passwordResetLookupShape, { when: lookupWhen }));

export const verifyPasswordResetCodeSchema = obj(
  shape({ ...passwordResetLookupShape, otp: otpCode('Enter the 6 digit code') }, { when: lookupWhen })
);

/*
  Continue with OTP. The lookup rules are the recovery request's — one shape,
  validated per channel — so the two doors cannot drift on what a phone number
  is. Aliased rather than re-declared (rule 34).
*/
export const requestLoginOtpSchema = passwordResetLookupSchema;
export const loginWithOtpSchema = verifyPasswordResetCodeSchema;

export const completePasswordResetSchema = obj(
  shape({
    reset_token: str(z.string().check(minLen(10), maxLen(200), filled()), { required: true }),
    // The application's password policy, in the one place every door reads it.
    new_password: password(),
  })
);

export const requestPortalLoginOtpSchema = obj(shape({ email: requiredEmail(), portal_key: portalKey() }));

export const portalLoginOtpSchema = obj(
  shape({ email: requiredEmail(), otp: otpCode('Enter the 6 digit code'), portal_key: portalKey() })
);

export const resetPasswordSchema = obj(
  shape({ email: requiredEmail(), otp: otpCode('Enter the 6 digit OTP'), new_password: password() })
);

// Change password. Step 1 verifies the current password and emails an OTP;
// step 2 confirms the OTP + sets the new one.
//
// current_password is optional here because a Google-signup account has no
// password to prove — the service is the only thing that can see whether a
// hash exists, so it decides whether one was required.
export const requestPasswordChangeSchema = obj(
  shape({ current_password: str(z.string().check(minLen(8), maxLen(100)).nullable().optional()) })
);

export const changePasswordSchema = obj(
  shape({ otp: otpCode('Enter the 6 digit OTP'), new_password: password() })
);

const googleSignupFields = {
  id_token: str(z.string().check(minLen(20), filled()), { required: true }),
  /*
    Google proves an email address and nothing else, so this door asks for the
    same WhatsApp number the email form asks for — and the same proof. Required
    here exactly as it is there: which door somebody came through cannot decide
    whether their number was ever answered on.
  */
  phone_number: phoneNumber(),
  phone_extension: phoneExtension(),
  whatsapp_is_mobile: bool(z.boolean(), { default: true }),
  whatsapp_token: whatsappToken(),
  // Google proves no birthday either, so the age gate needs this told — the
  // same rule as the email door's registerSchema.
  dob: dateOfBirth(),
  city: optionalText(),
  zone: optionalText(),
};

export const googleSignupSchema = obj(shape(googleSignupFields));

/**
 * The Apple door: everything the Google door asks, plus the name. Apple never
 * puts a name in its token — the client is handed it once, on the first
 * authorisation, and sends it here (or asks for it when Apple had already
 * shared it before) — so the first name is as required as it is on the email
 * form, with the email form's own rules.
 */
export const appleSignupSchema = obj(shape({ ...registerNames, ...googleSignupFields }));

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type RequestPasswordResetDTO = z.infer<typeof requestPasswordResetSchema>;
export type PasswordResetLookupDTO = z.infer<typeof passwordResetLookupSchema>;
export type VerifyPasswordResetCodeDTO = z.infer<typeof verifyPasswordResetCodeSchema>;
export type CompletePasswordResetDTO = z.infer<typeof completePasswordResetSchema>;
export type LoginWithOtpDTO = z.infer<typeof loginWithOtpSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
export type RequestPasswordChangeDTO = z.infer<typeof requestPasswordChangeSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type GoogleSignupDTO = z.infer<typeof googleSignupSchema>;
export type AppleSignupDTO = z.infer<typeof appleSignupSchema>;

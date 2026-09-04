import * as yup from 'yup';
import { phoneRegex, extRegex, personNameRegex } from '@modules/access/user/user.validator';

export const registerSchema = yup.object({
  // Names are shape-checked, not just length-checked: the single "Name" box is
  // split on whitespace, so anything the client let through became a surname.
  first_name: yup
    .string()
    .min(1)
    .max(60)
    .matches(personNameRegex, { message: 'Invalid first name' })
    .required(),
  // last_name is optional: the simplified signup collects a single "Name" that
  // may be a single word, so the surname can be empty.
  last_name: yup
    .string()
    .min(1)
    .max(60)
    .matches(personNameRegex, { message: 'Invalid last name', excludeEmptyString: true })
    .optional(),
  email: yup.string().email().required(),
  // Phone is collected at signup again, and required: it is the second thing an
  // account is identified by, and the unique index on it only means anything if
  // every account created through this door actually carries one.
  phone_number: yup.string().matches(phoneRegex, { message: 'Invalid phone' }).required(),
  phone_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid extension' })
    .required(),
  // The number is the WhatsApp one; this says whether it is the mobile number
  // too. Defaulted rather than required, so every shipped build that predates
  // the tick box keeps writing the phone exactly as it always did.
  whatsapp_is_mobile: yup.boolean().default(true),
  // The proof that the number above answered, minted by verifySignupWhatsAppOtp
  // and required: an account is not created for a number nobody has answered on.
  whatsapp_token: yup.string().min(10).max(200).required(),
  password: yup.string().min(8).max(100).required(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').required(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

/*
  Forgotten-password recovery, in three steps.

  The destination is validated per channel rather than "whatever was sent": a
  PHONE request with only an email would otherwise reach the OTP service, which
  would refuse it there with a message about a country code nobody was asked
  for. `when` is what keeps one input honest about two shapes.
*/
const passwordResetLookupShape = {
  channel: yup.string().oneOf(['EMAIL', 'PHONE']).required(),
  email: yup
    .string()
    .when('channel', { is: 'EMAIL', then: (s) => s.email().required(), otherwise: (s) => s.optional() }),
  phone_extension: yup.string().when('channel', {
    is: 'PHONE',
    then: (s) => s.matches(extRegex, { message: 'Invalid extension' }).required(),
    otherwise: (s) => s.optional(),
  }),
  phone_number: yup.string().when('channel', {
    is: 'PHONE',
    then: (s) => s.matches(phoneRegex, { message: 'Invalid phone' }).required(),
    otherwise: (s) => s.optional(),
  }),
};

export const loginSchema = yup.object({
  // The SAME per-channel destination rules the recovery and OTP doors validate,
  // spelled once below and spread here (rule 34): what counts as a phone number
  // cannot be allowed to differ between the door you sign in through and the
  // door you recover through. `channel` defaults to EMAIL so every client that
  // predates the phone option keeps working untouched.
  ...passwordResetLookupShape,
  // Overrides the spread's REQUIRED channel. Recovery has always sent one;
  // this door has not, and every portal and shipped app build still posts a
  // bare { email, password } — defaulting keeps all of them working, and the
  // per-channel rules above then read EMAIL and require the address exactly as
  // they did before.
  channel: yup.string().oneOf(['EMAIL', 'PHONE']).default('EMAIL'),
  password: yup.string().min(8).required(),
  // Which portal the login request comes from (appConfig.key). Optional —
  // consumer apps omit it; consoles send it so access can be enforced.
  portal_key: yup.string().max(64).optional(),
});

export const requestPasswordResetSchema = yup.object({
  email: yup.string().email().required(),
});


export const passwordResetLookupSchema = yup.object(passwordResetLookupShape);

export const verifyPasswordResetCodeSchema = yup.object({
  ...passwordResetLookupShape,
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit code')
    .required(),
});

/*
  Continue with OTP. The lookup rules are the recovery request's — one shape,
  validated per channel — so the two doors cannot drift on what a phone number
  is. Aliased rather than re-declared (rule 34).
*/
export const requestLoginOtpSchema = passwordResetLookupSchema;
export const loginWithOtpSchema = verifyPasswordResetCodeSchema;

export const completePasswordResetSchema = yup.object({
  reset_token: yup.string().min(10).max(200).required(),
  // The application's password policy, in the one place every door reads it.
  new_password: yup.string().min(8).max(100).required(),
});

export const requestPortalLoginOtpSchema = yup.object({
  email: yup.string().email().required(),
  portal_key: yup.string().max(64).optional(),
});

export const portalLoginOtpSchema = yup.object({
  email: yup.string().email().required(),
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit code')
    .required(),
  portal_key: yup.string().max(64).optional(),
});

export const resetPasswordSchema = yup.object({
  email: yup.string().email().required(),
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit OTP')
    .required(),
  new_password: yup.string().min(8).max(100).required(),
});

// Change password (user knows their current password). Step 1 verifies the
// current password and emails an OTP; step 2 confirms the OTP + sets the new one.
export const requestPasswordChangeSchema = yup.object({
  current_password: yup.string().min(8).max(100).required(),
});

export const changePasswordSchema = yup.object({
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit OTP')
    .required(),
  new_password: yup.string().min(8).max(100).required(),
});

export const googleSignupSchema = yup.object({
  id_token: yup.string().min(20).required(),
  /*
    Google proves an email address and nothing else, so this door asks for the
    same WhatsApp number the email form asks for — and the same proof. Required
    here exactly as it is there: which door somebody came through cannot decide
    whether their number was ever answered on.
  */
  phone_number: yup.string().matches(phoneRegex, { message: 'Invalid phone' }).required(),
  phone_extension: yup.string().matches(extRegex, { message: 'Invalid extension' }).required(),
  whatsapp_is_mobile: yup.boolean().default(true),
  whatsapp_token: yup.string().min(10).max(200).required(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').optional(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

export type RegisterDTO = yup.InferType<typeof registerSchema>;
export type LoginDTO = yup.InferType<typeof loginSchema>;
export type RequestPasswordResetDTO = yup.InferType<typeof requestPasswordResetSchema>;
export type PasswordResetLookupDTO = yup.InferType<typeof passwordResetLookupSchema>;
export type VerifyPasswordResetCodeDTO = yup.InferType<typeof verifyPasswordResetCodeSchema>;
export type CompletePasswordResetDTO = yup.InferType<typeof completePasswordResetSchema>;
export type LoginWithOtpDTO = yup.InferType<typeof loginWithOtpSchema>;
export type ResetPasswordDTO = yup.InferType<typeof resetPasswordSchema>;
export type RequestPasswordChangeDTO = yup.InferType<typeof requestPasswordChangeSchema>;
export type ChangePasswordDTO = yup.InferType<typeof changePasswordSchema>;
export type GoogleSignupDTO = yup.InferType<typeof googleSignupSchema>;

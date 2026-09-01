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
  password: yup.string().min(8).max(100).required(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').required(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

export const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
  // Which portal the login request comes from (appConfig.key). Optional —
  // consumer apps omit it; consoles send it so access can be enforced.
  portal_key: yup.string().max(64).optional(),
});

export const requestPasswordResetSchema = yup.object({
  email: yup.string().email().required(),
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

export const passwordResetLookupSchema = yup.object(passwordResetLookupShape);

export const verifyPasswordResetCodeSchema = yup.object({
  ...passwordResetLookupShape,
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit code')
    .required(),
});

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
  // Token-only Google signup: the account is created from the verified Google
  // profile and the user lands straight on the survey. Phone/dob are optional
  // and collected later.
  phone_number: yup
    .string()
    .matches(phoneRegex, { message: 'Invalid phone', excludeEmptyString: true })
    .optional(),
  phone_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid extension', excludeEmptyString: true })
    .optional(),
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
export type ResetPasswordDTO = yup.InferType<typeof resetPasswordSchema>;
export type RequestPasswordChangeDTO = yup.InferType<typeof requestPasswordChangeSchema>;
export type ChangePasswordDTO = yup.InferType<typeof changePasswordSchema>;
export type GoogleSignupDTO = yup.InferType<typeof googleSignupSchema>;

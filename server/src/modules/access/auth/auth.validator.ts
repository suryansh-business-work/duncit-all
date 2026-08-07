import * as yup from 'yup';
import { phoneRegex, extRegex } from '@modules/access/user/user.validator';

export const registerSchema = yup.object({
  first_name: yup.string().min(1).max(60).required(),
  // last_name is optional: the simplified signup collects a single "Name" that
  // may be a single word, so the surname can be empty.
  last_name: yup.string().min(1).max(60).optional(),
  email: yup.string().email().required(),
  // Phone is no longer collected at signup; it is gathered later (profile).
  phone_number: yup
    .string()
    .matches(phoneRegex, { message: 'Invalid phone', excludeEmptyString: true })
    .optional(),
  phone_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid extension', excludeEmptyString: true })
    .optional(),
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

// Self-serve account deletion: confirmed with a 6-digit email OTP.
export const deleteMyAccountSchema = yup.object({
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit OTP')
    .required(),
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
export type ResetPasswordDTO = yup.InferType<typeof resetPasswordSchema>;
export type RequestPasswordChangeDTO = yup.InferType<typeof requestPasswordChangeSchema>;
export type ChangePasswordDTO = yup.InferType<typeof changePasswordSchema>;
export type DeleteMyAccountDTO = yup.InferType<typeof deleteMyAccountSchema>;
export type GoogleSignupDTO = yup.InferType<typeof googleSignupSchema>;

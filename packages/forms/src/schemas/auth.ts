import { z } from 'zod';

import { makePasswordWithOtpSchema } from './password-with-otp';
import type { Translate } from './translate';

/** The longest address RFC 5321 allows, and what the server stores. */
const EMAIL_MAX = 254;

/**
 * Sign-in contract — email plus the 8-character password the server enforces.
 *
 * mWeb and the app had written this twice and already disagreed: the app's copy
 * validated `.email()` alone, so a blank box failed with "Enter a valid email"
 * where mWeb said "Email is required", and the app never applied the 254-char
 * ceiling the server does. This is mWeb's (correct) version.
 */
export function makeLoginSchema(t: Translate) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('mweb.auth.validation.emailRequired'))
      .email(t('mweb.auth.validation.emailInvalid'))
      .max(EMAIL_MAX),
    password: z.string().min(8, t('mweb.auth.validation.passwordMin')),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>;

export const loginDefaults: LoginFormValues = { email: '', password: '' };

/** Forgot-password — just the address the reset code is sent to. */
export function makeForgotPasswordSchema(t: Translate) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('mweb.auth.validation.emailRequired'))
      .email(t('mweb.auth.validation.emailInvalid'))
      .max(EMAIL_MAX),
  });
}

export type ForgotPasswordValues = z.infer<ReturnType<typeof makeForgotPasswordSchema>>;

export const forgotPasswordDefaults: ForgotPasswordValues = { email: '' };

/**
 * Reset-password — the emailed code plus a new password typed twice.
 *
 * The same contract the signed-in change-password flow commits with: one set of
 * rules, reached from two screens — see `makePasswordWithOtpSchema`.
 */
export const makeResetPasswordSchema = makePasswordWithOtpSchema;

export type ResetPasswordValues = z.infer<ReturnType<typeof makeResetPasswordSchema>>;

export { passwordWithOtpDefaults as resetPasswordDefaults } from './password-with-otp';

import { z } from 'zod';

import type { Translate } from './translate';

/**
 * A new password behind a one-time code — the contract BOTH password flows use.
 *
 * Forgot-password (signed out) and change-password (signed in) reach it from
 * different screens, but the rules are the same one: the 6-digit code that was
 * emailed, a password the server will accept, and a confirm box that has to
 * match. Writing it twice is how the two flows end up with different ceilings.
 *
 * The confirm match reports on `confirm_password` so the error lands under the
 * box the reader last touched, rather than on the field above it.
 */
export function makePasswordWithOtpSchema(t: Translate) {
  return z
    .object({
      otp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, t('mweb.resetPassword.validation.otpInvalid')),
      new_password: z
        .string()
        .min(8, t('mweb.auth.validation.passwordMin'))
        .max(100, t('mweb.auth.validation.passwordTooLong')),
      confirm_password: z.string().min(8, t('mweb.auth.validation.passwordMin')),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: t('mweb.auth.validation.passwordsMismatch'),
      path: ['confirm_password'],
    });
}

export type PasswordWithOtpValues = z.infer<ReturnType<typeof makePasswordWithOtpSchema>>;

/** Both flows start from an empty code and an empty pair. */
export const passwordWithOtpDefaults: PasswordWithOtpValues = {
  otp: '',
  new_password: '',
  confirm_password: '',
};

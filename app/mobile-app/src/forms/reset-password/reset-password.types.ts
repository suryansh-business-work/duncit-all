import { z } from 'zod';

import { fallbackT, type Translate } from '@/i18n/fallback';

/**
 * Reset-password contract — 6-digit OTP + a new password confirmed twice.
 * Mirrors the server's `resetPasswordWithOtp` rules plus a client confirm match.
 * The messages come from the shared catalogue (rule 38): the form passes its
 * live `t`, and the export below resolves against bundled English.
 */
export function makeResetPasswordSchema(t: Translate = fallbackT) {
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

export const resetPasswordSchema = makeResetPasswordSchema();

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const resetPasswordDefaults: ResetPasswordFormValues = {
  otp: '',
  new_password: '',
  confirm_password: '',
};

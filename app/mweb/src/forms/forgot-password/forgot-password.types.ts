import { z } from 'zod';
import { fallbackT, type Translate } from '../../i18n/fallback';

/**
 * Forgot-password contract — RHF + Zod. Just the email we send the reset OTP to;
 * mirrors the server's `requestPasswordResetOtp` validation.
 *
 * The messages come from the shared catalogue (rule 38): the form passes its
 * live `t`, and the export below resolves against the bundled English.
 */
export function makeForgotPasswordSchema(t: Translate = fallbackT) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t('mweb.auth.validation.emailRequired'))
      .email(t('mweb.auth.validation.emailInvalid'))
      .max(254),
  });
}

export const forgotPasswordSchema = makeForgotPasswordSchema();

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const forgotPasswordDefaults: ForgotPasswordValues = { email: '' };

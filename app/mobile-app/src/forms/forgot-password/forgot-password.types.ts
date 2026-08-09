import { z } from 'zod';

import { fallbackT, type Translate } from '@/i18n/fallback';

/** Forgot-password contract — the email we send the reset OTP to. Mirrors mWeb,
 * messages included: they come from the shared catalogue (rule 38). */
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

import { z } from 'zod';
import { EMAIL, OTP_6 } from '@duncit/regex';

import type { Translate } from '@/i18n/fallback';

/**
 * Signing in with an emailed code (the portal's "Login with OTP"): the
 * address first, then the six digits the server sent to it.
 */
export const makeOtpLoginSchema = (t: Translate) =>
  z.object({
    email: z.string().trim().regex(EMAIL, t('crmApp.otp.emailInvalid')),
    code: z.string().trim(),
  });

/** The code step's own rule, checked only once a code has been sent. */
export const makeOtpCodeSchema = (t: Translate) =>
  z.string().trim().regex(OTP_6, t('crmApp.otp.codeInvalid'));

export type OtpLoginValues = z.infer<ReturnType<typeof makeOtpLoginSchema>>;

export const otpLoginDefaults: OtpLoginValues = { email: '', code: '' };

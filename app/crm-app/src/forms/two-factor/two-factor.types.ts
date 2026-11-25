import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';

import type { Translate } from '@/i18n/fallback';

/** An authenticator code: six digits, the shape the server checks. */
export const makeTwoFactorSchema = (t: Translate) =>
  z.object({
    code: z.string().trim().regex(OTP_6, t('crmApp.twoFactor.codeInvalid')),
  });

export type TwoFactorValues = z.infer<ReturnType<typeof makeTwoFactorSchema>>;

export const twoFactorDefaults: TwoFactorValues = { code: '' };

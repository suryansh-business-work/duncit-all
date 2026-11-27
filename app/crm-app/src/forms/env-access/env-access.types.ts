import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';

import type { Translate } from '@/i18n/fallback';

/** The code the root admin was emailed: six digits, as the Tech portal's access gate checks it. */
export const makeEnvAccessSchema = (t: Translate) =>
  z.object({
    code: z.string().trim().regex(OTP_6, t('crmApp.twilio.codeInvalid')),
  });

export type EnvAccessValues = z.infer<ReturnType<typeof makeEnvAccessSchema>>;

export const envAccessDefaults: EnvAccessValues = { code: '' };

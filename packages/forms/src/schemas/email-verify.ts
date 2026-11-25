import { z } from 'zod';
import { EMAIL } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * One address to check now (CRM › Tools › Email Verifier) — the shared EMAIL
 * pattern, so the form refuses what the server refuses. The CRM portal and the
 * Duncit CRM app both check with this.
 */
export const makeEmailVerifySchema = (t: Translate) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t('crm.emailVerifier.emailRequired'))
      .regex(EMAIL, t('crm.emailVerifier.emailInvalid')),
  });

export type EmailVerifyValues = z.infer<ReturnType<typeof makeEmailVerifySchema>>;

export const emailVerifyDefaults: EmailVerifyValues = { email: '' };

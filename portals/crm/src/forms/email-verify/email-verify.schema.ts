import { z } from 'zod';
import { EMAIL } from '@duncit/regex';
import type { Translate } from './email-verify.types';

/** One address to check now — the shared EMAIL pattern, so it matches the server's. */
export const emailVerifySchema = (t: Translate) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t('crm.emailVerifier.emailRequired'))
      .regex(EMAIL, t('crm.emailVerifier.emailInvalid')),
  });

export type EmailVerifyFormValues = z.infer<ReturnType<typeof emailVerifySchema>>;

export const emailVerifyDefaults: EmailVerifyFormValues = { email: '' };

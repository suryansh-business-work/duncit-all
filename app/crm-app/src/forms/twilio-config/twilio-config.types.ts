import { z } from 'zod';
import { PHONE_E164 } from '@duncit/regex';

import type { Translate } from '@/i18n/fallback';

/**
 * The call line's Twilio settings. The server checks each against the env
 * registry on save; the form checks first, field by field: the account, the
 * caller-ID number in E.164 (`+14155552671`), an optional agent number in
 * E.164, and the auth token — required only when none is saved yet (a blank
 * token keeps the stored one).
 */
export const makeTwilioConfigSchema = (t: Translate, tokenSaved: boolean) => {
  const required = t('crmApp.twilio.required');
  const phone = t('crmApp.twilio.phoneInvalid');
  return z.object({
    account_sid: z.string().trim().min(1, required),
    auth_token: tokenSaved ? z.string().trim() : z.string().trim().min(1, required),
    phone_number: z.string().trim().regex(PHONE_E164, phone),
    agent_phone_number: z
      .string()
      .trim()
      .refine((value) => value === '' || PHONE_E164.test(value), phone),
  });
};

export type TwilioConfigValues = z.infer<ReturnType<typeof makeTwilioConfigSchema>>;

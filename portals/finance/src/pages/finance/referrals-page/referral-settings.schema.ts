import { z } from 'zod';
import { REFERRAL_MESSAGE_TOKENS } from '@duncit/utils';
import type { ReferralSettings } from './queries';

/*
  `coins_per_referral` is deliberately absent from this form. It is one of the
  coin payout rules, and all of them are set together on Duncit Coin > Settings
  so no screen can quote a reward the platform stopped paying. This page still
  READS it — the preview below has to show members the real number.
*/

/*
  The link is the point of sharing, so the message has to carry it.

  Everything else is optional — a member can read their code out loud, and the
  coin count is a promise Finance may not want to make in every campaign — but a
  message without {link} sends people nowhere, and nothing downstream can add
  one back.
*/
const shareMessage = z
  .string()
  .trim()
  .max(500, 'Keep the share message under 500 characters.')
  .refine(
    (value) => value === '' || value.includes('{link}'),
    `Include {link} so the message carries a signup link. Available: ${REFERRAL_MESSAGE_TOKENS.join(', ')}`,
  );

export const referralSettingsSchema = z.object({
  gift_description: z.string().trim().max(300, 'Keep the gift line under 300 characters.'),
  share_message: shareMessage,
});

export type ReferralSettingsForm = z.infer<typeof referralSettingsSchema>;

export const BLANK_SETTINGS: ReferralSettingsForm = {
  gift_description: '',
  share_message: '',
};

/** Server payload -> form strings. */
export function toFormValues(settings: ReferralSettings): ReferralSettingsForm {
  return {
    gift_description: settings.gift_description ?? '',
    share_message: settings.share_message ?? '',
  };
}

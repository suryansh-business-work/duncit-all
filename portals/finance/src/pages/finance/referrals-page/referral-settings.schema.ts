import { z } from 'zod';
import { REFERRAL_MESSAGE_TOKENS } from '@duncit/utils';
import type { ReferralSettings } from './queries';

/** Sanity ceiling: a payout above this is a typo, not a promotion. */
export const MAX_COINS_PER_REFERRAL = 100000;

/**
 * Coins are held as a string so an emptied field stays empty rather than
 * collapsing to 0 — the difference between "not filled in yet" and "referrals
 * pay nothing", which are very different instructions to give the platform.
 */
const coins = z
  .string()
  .trim()
  .min(1, 'Enter how many coins a referral pays.')
  .regex(/^\d+$/, 'Whole coins only — digits, no decimals or symbols.')
  .refine(
    (value) => Number.parseInt(value, 10) <= MAX_COINS_PER_REFERRAL,
    `Keep the reward at or under ${MAX_COINS_PER_REFERRAL.toLocaleString('en-IN')} coins.`,
  );

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
  coins_per_referral: coins,
  gift_description: z.string().trim().max(300, 'Keep the gift line under 300 characters.'),
  share_message: shareMessage,
});

export type ReferralSettingsForm = z.infer<typeof referralSettingsSchema>;

export const BLANK_SETTINGS: ReferralSettingsForm = {
  coins_per_referral: '',
  gift_description: '',
  share_message: '',
};

/** Server payload -> form strings. */
export function toFormValues(settings: ReferralSettings): ReferralSettingsForm {
  return {
    coins_per_referral: String(settings.coins_per_referral ?? 0),
    gift_description: settings.gift_description ?? '',
    share_message: settings.share_message ?? '',
  };
}

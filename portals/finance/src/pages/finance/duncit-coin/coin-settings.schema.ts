import { z } from 'zod';
import type { CoinSettings } from './queries';

/** Sanity ceiling: a payout above this is a typo, not a promotion. */
export const MAX_COINS_PER_REFERRAL = 100000;

/**
 * Every number here is held as a STRING so an emptied field stays empty rather
 * than collapsing to 0 — the difference between "not filled in yet" and "pay
 * nothing", which are very different instructions to give the platform. 0 is a
 * legal, meaningful value in all three fields, so it must be typed on purpose.
 */
const percent = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${what} rate.`)
    .regex(/^\d+$/, 'Whole percents only — digits, no decimals or symbols.')
    .refine((v) => Number.parseInt(v, 10) <= 100, 'A rate cannot go above 100%.');

const coins = z
  .string()
  .trim()
  .min(1, 'Enter how many coins a referral pays.')
  .regex(/^\d+$/, 'Whole coins only — digits, no decimals or symbols.')
  .refine(
    (value) => Number.parseInt(value, 10) <= MAX_COINS_PER_REFERRAL,
    `Keep the reward at or under ${MAX_COINS_PER_REFERRAL.toLocaleString('en-IN')} coins.`,
  );

export const coinSettingsSchema = z.object({
  pod_join_earn_pct: percent('pod join'),
  shop_earn_pct: percent('shop'),
  coins_per_referral: coins,
});

export type CoinSettingsForm = z.infer<typeof coinSettingsSchema>;

export const BLANK_COIN_SETTINGS: CoinSettingsForm = {
  pod_join_earn_pct: '',
  shop_earn_pct: '',
  coins_per_referral: '',
};

/** Server payload -> form strings. */
export function toCoinSettingsForm(settings: CoinSettings): CoinSettingsForm {
  return {
    pod_join_earn_pct: String(settings.pod_join_earn_pct ?? 0),
    shop_earn_pct: String(settings.shop_earn_pct ?? 0),
    coins_per_referral: String(settings.coins_per_referral ?? 0),
  };
}

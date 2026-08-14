import { z } from 'zod';
import type { Translator } from '@duncit/app-settings';
import type { GiftCardSettings } from './queries';

/**
 * Every number is held as a STRING so an emptied field stays empty rather than
 * collapsing to 0 — the difference between "not filled in yet" and a real value
 * (see the coin settings schema, which set this convention).
 */
export interface GiftCardSettingsForm {
  denominations: string;
  min_amount: string;
  max_amount: string;
  validity_months: string;
}

/** Whole rupees separated by commas: "500, 1000, 2000". */
const INT_LIST = /^\d+(\s*,\s*\d+)*$/;

const DIGITS = /^\d+$/;

/**
 * Messages reuse the field's own label key: the bundle ships no dedicated
 * validation copy for this form yet, and a raw English sentence would break
 * rule 38. The hint doubles as the denominations message because it already
 * states the expected shape.
 */
export const giftCardSettingsSchema = (t: Translator['t']) =>
  z.object({
    denominations: z
      .string()
      .trim()
      .min(1, t('finance.giftCards.denominationsHint'))
      .regex(INT_LIST, t('finance.giftCards.denominationsHint')),
    min_amount: z
      .string()
      .trim()
      .min(1, t('finance.giftCards.minAmountLabel'))
      .regex(DIGITS, t('finance.giftCards.minAmountLabel')),
    max_amount: z
      .string()
      .trim()
      .min(1, t('finance.giftCards.maxAmountLabel'))
      .regex(DIGITS, t('finance.giftCards.maxAmountLabel')),
    validity_months: z
      .string()
      .trim()
      .min(1, t('finance.giftCards.validityLabel'))
      .regex(DIGITS, t('finance.giftCards.validityLabel')),
  });

export const BLANK_GIFT_CARD_SETTINGS: GiftCardSettingsForm = {
  denominations: '',
  min_amount: '',
  max_amount: '',
  validity_months: '',
};

/** Server payload -> form strings. */
export function toGiftCardSettingsForm(settings: GiftCardSettings): GiftCardSettingsForm {
  return {
    denominations: (settings.denominations ?? []).join(', '),
    min_amount: String(settings.min_amount ?? 0),
    max_amount: String(settings.max_amount ?? 0),
    validity_months: String(settings.validity_months ?? 0),
  };
}

/** "500, 1000,2000" -> [500, 1000, 2000]. Only called on schema-valid input. */
export function parseDenominations(value: string): number[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => Number.parseInt(part, 10));
}

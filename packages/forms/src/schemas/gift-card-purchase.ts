import { z } from 'zod';
import { DIGITS, EMAIL } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * Buying gift cards — the one unified card (the catalogue's default design).
 *
 * mWeb (MUI) and the native app (Tamagui) render the buy form separately, but
 * the rules are one copy (rules 27 and 40), checked against the same live
 * policy the server enforces (Loyalty > Gift Card Settings): an amount within
 * the configured minimum and maximum, a quantity within the per-order maximum,
 * printed cards only while they are switched on and in stock, and an email for
 * a digital gift.
 */

export type GiftCardDeliveryMode = 'DIGITAL' | 'PHYSICAL';

/** The live policy a purchase is judged against — read from `giftCardStorefront`. */
export interface GiftCardPurchasePolicy {
  min_amount: number;
  max_amount: number;
  max_quantity: number;
  physical_enabled: boolean;
  /** Printed cards of the default design still in stock (0 when delivery is off). */
  physical_available: number;
  shipping_fee: number;
}

/** Numbers stay strings in the form, so an emptied box reads empty, not 0. */
export interface GiftCardPurchaseValues {
  amount: string;
  quantity: string;
  delivery_mode: GiftCardDeliveryMode;
  /** Digital only: send to someone else (true) or keep it (false). */
  gift: boolean;
  recipient_email: string;
  recipient_name: string;
  message: string;
}

export const GIFT_CARD_TEXT_LIMITS = { recipientName: 160, message: 300, email: 254 } as const;

const wholeWithin = (value: string, min: number, max: number) =>
  DIGITS.test(value.trim()) && Number(value) >= min && Number(value) <= max;

/** Can printed cards be ordered at all right now? */
export const canOrderPhysical = (policy: GiftCardPurchasePolicy): boolean =>
  policy.physical_enabled && policy.physical_available > 0;

/** The most cards this order may hold — printed orders are also capped by stock. */
export function maxQuantityFor(policy: GiftCardPurchasePolicy, mode: GiftCardDeliveryMode): number {
  const cap = Math.max(1, policy.max_quantity);
  return mode === 'PHYSICAL' ? Math.max(1, Math.min(cap, policy.physical_available)) : cap;
}

export function makeGiftCardPurchaseSchema(t: Translate, policy: GiftCardPurchasePolicy) {
  return z
    .object({
      amount: z.string(),
      quantity: z.string(),
      delivery_mode: z.enum(['DIGITAL', 'PHYSICAL']),
      gift: z.boolean(),
      recipient_email: z.string().trim().max(GIFT_CARD_TEXT_LIMITS.email),
      recipient_name: z.string().trim().max(GIFT_CARD_TEXT_LIMITS.recipientName),
      message: z
        .string()
        .trim()
        .max(GIFT_CARD_TEXT_LIMITS.message, t('mweb.giftCards.messageMax', { vars: { max: GIFT_CARD_TEXT_LIMITS.message } })),
    })
    .superRefine((v, ctx) => {
      if (!wholeWithin(v.amount, policy.min_amount, policy.max_amount)) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: t('mweb.giftCards.amountRangeHint', { vars: { min: policy.min_amount, max: policy.max_amount } }),
        });
      }
      const maxQty = maxQuantityFor(policy, v.delivery_mode);
      if (!wholeWithin(v.quantity, 1, maxQty)) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: t('mweb.giftCards.quantityRange', { vars: { max: maxQty } }),
        });
      }
      if (v.delivery_mode === 'PHYSICAL' && !canOrderPhysical(policy)) {
        ctx.addIssue({ code: 'custom', path: ['delivery_mode'], message: t('mweb.giftCards.physicalUnavailable') });
      }
      if (v.delivery_mode === 'DIGITAL' && v.gift && !EMAIL.test(v.recipient_email.trim())) {
        ctx.addIssue({ code: 'custom', path: ['recipient_email'], message: t('mweb.auth.validation.emailInvalid') });
      }
    });
}

/** A fresh form: the first preset amount, one card, by email, for yourself. */
export function giftCardPurchaseDefaults(denominations: readonly number[], policy: GiftCardPurchasePolicy): GiftCardPurchaseValues {
  const first = denominations.find((d) => d >= policy.min_amount && d <= policy.max_amount);
  return {
    amount: first ? String(first) : '',
    quantity: '1',
    delivery_mode: 'DIGITAL',
    gift: false,
    recipient_email: '',
    recipient_name: '',
    message: '',
  };
}

export interface GiftCardPurchaseTotals {
  /** Face value of one card (0 while the amount box is not a number). */
  amount: number;
  quantity: number;
  cardsValue: number;
  /** Charged once on a printed order, whatever the quantity; 0 for email. */
  shippingFee: number;
  total: number;
}

/** What the buyer will pay — the same arithmetic the server charges. */
export function giftCardPurchaseTotals(values: Pick<GiftCardPurchaseValues, 'amount' | 'quantity' | 'delivery_mode'>, shippingFee: number): GiftCardPurchaseTotals {
  const amount = DIGITS.test(values.amount.trim()) ? Number(values.amount) : 0;
  const quantity = DIGITS.test(values.quantity.trim()) ? Math.max(1, Number(values.quantity)) : 1;
  const fee = values.delivery_mode === 'PHYSICAL' ? shippingFee : 0;
  return { amount, quantity, cardsValue: amount * quantity, shippingFee: fee, total: amount * quantity + fee };
}

/**
 * What a valid form sends to checkout — a printed card is handed over, so it
 * names no inbox; a digital card kept for yourself names nobody at all.
 */
export function giftCardPurchaseRecipient(values: GiftCardPurchaseValues) {
  const digitalGift = values.delivery_mode === 'DIGITAL' && values.gift;
  const named = values.delivery_mode === 'PHYSICAL' || digitalGift;
  return {
    recipient_email: digitalGift ? values.recipient_email.trim() : '',
    recipient_name: named ? values.recipient_name.trim() : '',
    message: named ? values.message.trim() : '',
  };
}

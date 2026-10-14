import { z } from 'zod';
import { COUPON_CODE, DIGITS } from '@duncit/regex';
import { FOOD_ORDER_LIMITS, type FoodOwnerCoupon } from '@duncit/utils';

import type { Translate } from './translate';

/** The server's bound on a coupon's description. */
export const FOOD_COUPON_DESCRIPTION_MAX = 300;
/** The largest whole number the API's `Int` carries — a use limit above it is refused before it is read. */
const INT_MAX = 2_147_483_647;

/** A whole number typed into a text box; NaN for anything else. */
const wholeNumber = (raw: string) => (DIGITS.test(raw.trim()) ? Number(raw.trim()) : Number.NaN);

/** Rupees with at most two decimals, as typed; NaN for anything else. */
const rupees = (raw: string) => {
  const [whole = '', fraction, ...rest] = raw.trim().split('.');
  const fractionOk = fraction === undefined || (DIGITS.test(fraction) && fraction.length <= 2);
  return rest.length === 0 && DIGITS.test(whole) && fractionOk ? Number(raw) : Number.NaN;
};

const isBlank = (raw: string) => raw.trim() === '';

/** A use limit: blank for none, else a whole number of 1 or more. */
const limitRule = (message: string) =>
  z.string().refine((raw) => isBlank(raw) || (wholeNumber(raw) >= 1 && wholeNumber(raw) <= INT_MAX), message);

/**
 * A venue's food coupon, checked the way the server checks it: the shared
 * coupon-code shape, a whole percent up to the venue discount ceiling, limits
 * of 1 or more and an end that falls after the start. Numbers stay the text the
 * owner typed, so a blank limit means "no limit" rather than 0. One rule for
 * the MUI form (@duncit/venue-food) and the native one.
 */
export function makeFoodCouponSchema(t: Translate) {
  // Read when a schema is built, not when the module loads: a test that mocks
  // @duncit/utils for something else must still be able to import @duncit/forms.
  const { couponCodeMin, couponCodeMax, maxDiscountPct } = FOOD_ORDER_LIMITS;
  const dateRule = z.date({ error: t('venueFoodOwner.coupons.dateInvalid') }).nullable();
  const lengthMessage = t('venueFoodOwner.coupons.codeLength', { vars: { min: couponCodeMin, max: couponCodeMax } });
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t('venueFoodOwner.coupons.codeRequired'))
        .min(couponCodeMin, lengthMessage)
        .max(couponCodeMax, lengthMessage)
        .regex(COUPON_CODE, t('venueFoodOwner.coupons.codePattern')),
      description: z
        .string()
        .trim()
        .max(
          FOOD_COUPON_DESCRIPTION_MAX,
          t('venueFoodOwner.coupons.descriptionTooLong', { vars: { max: FOOD_COUPON_DESCRIPTION_MAX } }),
        ),
      discount_pct: z
        .string()
        .refine(
          (raw) => wholeNumber(raw) >= 1 && wholeNumber(raw) <= maxDiscountPct,
          t('venueFoodOwner.coupons.discountRange', { vars: { max: maxDiscountPct } }),
        ),
      min_order_amount: z
        .string()
        .refine((raw) => isBlank(raw) || rupees(raw) >= 0, t('venueFoodOwner.coupons.minOrderInvalid')),
      valid_from: dateRule,
      valid_until: dateRule,
      max_uses: limitRule(t('venueFoodOwner.coupons.limitInvalid')),
      per_phone_limit: limitRule(t('venueFoodOwner.coupons.limitInvalid')),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const { valid_from: from, valid_until: until } = values;
      if (from && until && until.getTime() <= from.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['valid_until'], message: t('venueFoodOwner.coupons.endAfterStart') });
      }
    });
}

export type FoodCouponFormValues = z.infer<ReturnType<typeof makeFoodCouponSchema>>;

const dateOf = (iso: string | null | undefined) => (iso ? new Date(iso) : null);
const textOf = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/** What the form opens with: a new coupon blank and switched on, a saved one as it stands. */
export const foodCouponToValues = (coupon: FoodOwnerCoupon | null): FoodCouponFormValues => ({
  code: coupon?.code ?? '',
  description: coupon?.description ?? '',
  discount_pct: textOf(coupon?.discount_pct),
  // No minimum is stored as 0; the box shows it empty, as the owner left it.
  min_order_amount: coupon && coupon.min_order_amount > 0 ? String(coupon.min_order_amount) : '',
  valid_from: dateOf(coupon?.valid_from),
  valid_until: dateOf(coupon?.valid_until),
  max_uses: textOf(coupon?.max_uses),
  per_phone_limit: textOf(coupon?.per_phone_limit),
  is_active: coupon?.is_active ?? true,
});

/** The coupon's terms as `CreateVenueFoodCouponInput` / `UpdateVenueFoodCouponInput` take them (less the venue). */
export interface FoodCouponInput {
  code: string;
  description: string;
  discount_pct: number;
  min_order_amount: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  per_phone_limit: number | null;
  is_active: boolean;
}

const limitOf = (raw: string) => (isBlank(raw) ? null : wholeNumber(raw));

/**
 * The coupon's terms as the API takes them, for a create and an edit alike.
 * Every field is sent, so an edit that empties a window or a limit sends the
 * null the server reads as "clear it".
 */
export const toFoodCouponInput = (values: FoodCouponFormValues): FoodCouponInput => ({
  code: values.code.trim().toUpperCase(),
  description: values.description.trim(),
  discount_pct: wholeNumber(values.discount_pct),
  min_order_amount: isBlank(values.min_order_amount) ? 0 : rupees(values.min_order_amount),
  valid_from: values.valid_from?.toISOString() ?? null,
  valid_until: values.valid_until?.toISOString() ?? null,
  max_uses: limitOf(values.max_uses),
  per_phone_limit: limitOf(values.per_phone_limit),
  is_active: values.is_active,
});

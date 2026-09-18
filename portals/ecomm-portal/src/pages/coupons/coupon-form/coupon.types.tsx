import { z } from 'zod';
import { numberText, toNumber, toOptionalInt } from '../../../lib/format';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreCoupon } from '../queries';

const CODE = /^[A-Za-z\d_-]{3,30}$/;

/** Mirrors `CreateCouponInput`; the scope is always the store's own. */
export const makeCouponSchema = (t: Translate) => {
  const r = makeRules(t);
  return z
    .object({
      code: z.string().trim().regex(CODE, t('ecommPortal.coupons.codeRule')),
      description: r.optionalText(200),
      discount_pct: r.percent(100).refine((value) => Number(value) > 0, t('ecommPortal.coupons.discountRequired')),
      valid_from: z.string(),
      valid_until: z.string(),
      max_uses: r.whole(),
      per_user_limit: r.whole(),
      min_order_amount: r.amount(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.valid_from && values.valid_until && values.valid_until < values.valid_from) {
        ctx.addIssue({ code: 'custom', path: ['valid_until'], message: t('ecommPortal.coupons.untilAfterFrom') });
      }
    });
};

export type CouponValues = z.infer<ReturnType<typeof makeCouponSchema>>;

export const toCouponValues = (coupon: StoreCoupon | null): CouponValues => ({
  code: coupon?.code ?? '',
  description: coupon?.description ?? '',
  discount_pct: numberText(coupon?.discount_pct),
  valid_from: coupon?.valid_from ?? '',
  valid_until: coupon?.valid_until ?? '',
  max_uses: numberText(coupon?.max_uses),
  per_user_limit: numberText(coupon?.per_user_limit),
  min_order_amount: numberText(coupon?.min_order_amount),
  is_active: coupon?.is_active ?? true,
});

/** The server input — codes are stored upper-case; a blank limit means none. */
export const toCouponInput = (values: CouponValues) => ({
  code: values.code.toUpperCase(),
  description: values.description,
  discount_pct: toNumber(values.discount_pct),
  scope: 'STORE',
  valid_from: values.valid_from || null,
  valid_until: values.valid_until || null,
  max_uses: toOptionalInt(values.max_uses),
  per_user_limit: toOptionalInt(values.per_user_limit),
  min_order_amount: toNumber(values.min_order_amount),
  is_active: values.is_active,
});

import { z } from 'zod';
import { FOOD_ORDER_LIMITS, normalizeFoodCouponCode, type FoodCartPrice } from '@duncit/utils';
import type { FoodCouponControl } from '../useFoodCoupon';

type Translate = (key: string) => string;

/**
 * The one field: a code, read the way the server stores it (trimmed, upper
 * case) and held inside the server's own length limits. Whether the code is
 * any good is the server's answer, not this schema's.
 */
export function makeFoodCouponSchema(t: Translate) {
  const invalid = t('mweb.venueFood.coupon.rejected.invalid');
  return z.object({
    code: z
      .string()
      .transform(normalizeFoodCouponCode)
      .pipe(z.string().min(FOOD_ORDER_LIMITS.couponCodeMin, invalid).max(FOOD_ORDER_LIMITS.couponCodeMax, invalid)),
  });
}

export type FoodCouponValues = z.infer<ReturnType<typeof makeFoodCouponSchema>>;

export const foodCouponDefaults: FoodCouponValues = { code: '' };

export interface FoodCouponFormProps {
  coupon: FoodCouponControl;
  /** The cart as it is priced now — with the applied code, when there is one. */
  price: FoodCartPrice;
  currency: string;
  /** A payment is in flight: the code can be neither applied nor removed. */
  disabled: boolean;
}

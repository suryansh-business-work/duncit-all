import { useRef, useState } from 'react';
import { logs } from '@duncit/logs';
import { PHONE_NUMBER } from '@duncit/regex';
import {
  FOOD_COUPON_REJECTION_KEYS,
  FOOD_ORDER_ERROR,
  FOOD_ORDER_LIMITS,
  foodOrderErrorKey,
  foodOrderLineInputs,
  normalizeFoodCouponCode,
  type FoodCartLine,
} from '@duncit/utils';

import type { FoodCart } from '@/hooks/useFoodCart';
import { foodCouponRefusal, type FoodCheckoutError } from '@/hooks/useFoodCheckout';
import { useTranslation } from '@/hooks/useTranslation';
import { foodOrderNativeErrorCode, previewFoodCoupon } from '@/services/food-order';

type Translate = (key: string) => string;

/** The one question asked of the server, on Apply and again at Pay: what does this code do to this cart. */
const askFoodCoupon = (
  venueId: string,
  lines: readonly FoodCartLine[],
  code: string,
  phone: string,
) =>
  previewFoodCoupon({
    venue_id: venueId,
    coupon_code: normalizeFoodCouponCode(code),
    items: foodOrderLineInputs(lines),
    // A complete number lets the per-person limit be checked before the order is placed.
    customer_phone: PHONE_NUMBER.test(phone) ? phone : null,
  });

/** The sentence for a check that did not come back: the server's own refusal when it gave a code, else "could not check". */
const couponFailureText = (code: string, t: Translate): string =>
  code
    ? t(foodOrderErrorKey(code, 'mweb.venueFood.coupon.failed'))
    : t('mweb.venueFood.coupon.failed');

/** Refusals the place mutation gives too, and the screen already reacts to there. */
const PLACE_ANSWERS = new Set<string>([FOOD_ORDER_ERROR.closed, FOOD_ORDER_ERROR.itemUnavailable]);

interface ConfirmOptions {
  venueId: string;
  cart: FoodCart;
  /** Why the order is not being placed — shown beside the Pay button. */
  onStopped: (error: FoodCheckoutError) => void;
}

/**
 * The applied code, asked about once more when Pay is pressed — it was accepted
 * for an earlier cart, perhaps on an earlier visit, and now the mobile typed is
 * known. `confirm` answers whether the order may be placed: yes with no code,
 * with one the cart no longer earns (that order goes without it), or with one
 * the server still takes on the same terms. Changed terms re-price the cart and
 * stop, so the member presses Pay again on the total they can now see; a
 * refused code or a failed check stops with its sentence. RN twin of `confirm`
 * in mWeb's food/useFoodCoupon.
 */
export function useFoodCouponConfirm({ venueId, cart, onStopped }: Readonly<ConfirmOptions>) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  const check = async (applied: NonNullable<FoodCart['coupon']>, phone: string) => {
    try {
      const preview = await askFoodCoupon(venueId, cart.lines, applied.code, phone);
      if (!preview.ok) {
        onStopped(foodCouponRefusal(preview.reason ?? 'INVALID', t));
        return false;
      }
      const same =
        preview.coupon_pct === applied.coupon_pct &&
        preview.min_order_amount === applied.min_order_amount;
      if (!same) {
        cart.applyCoupon({
          code: preview.coupon_code ?? applied.code,
          coupon_pct: preview.coupon_pct,
          min_order_amount: preview.min_order_amount,
        });
      }
      return same;
    } catch (err) {
      const code = foodOrderNativeErrorCode(err);
      logs.mobileApp.warn('venueFood', 'confirmCoupon', { error: err, code, venueId });
      if (PLACE_ANSWERS.has(code)) return true;
      onStopped({ title: null, message: couponFailureText(code, t) });
      return false;
    }
  };

  const confirm = async (phone: string): Promise<boolean> => {
    const applied = cart.coupon;
    if (!applied || cart.price.couponUnmet) return true;
    setConfirming(true);
    const proceed = await check(applied, phone);
    setConfirming(false);
    return proceed;
  };

  return { confirming, confirm };
}

interface Options {
  venueId: string;
  cart: FoodCart;
  /** The mobile number typed so far — a complete one lets the per-person limit be checked early. */
  phone: () => string;
}

/**
 * The cart's coupon box: what is being typed, the one question it asks the
 * server — what would this code do to this cart — and what came back. An
 * accepted code is handed to the cart, which keeps it and re-prices itself on
 * every change after that without asking again; a refused one is said in place.
 * The server prices the order again when it is placed, so nothing here decides
 * what is charged. The second and last question is `useFoodCouponConfirm`'s,
 * at Pay.
 */
export function useFoodCoupon({ venueId, cart, phone }: Readonly<Options>) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Said once, under the box the removed code came back to.
  const [removed, setRemoved] = useState(false);
  // A ref, not the state: two taps in one frame both read `applying` as false.
  const busy = useRef(false);

  const normalized = normalizeFoodCouponCode(code);
  const complete = normalized.length >= FOOD_ORDER_LIMITS.couponCodeMin;

  const type = (next: string) => {
    setCode(next.toUpperCase());
    setError(null);
    setRemoved(false);
  };

  /** Apply what was typed — or `picked`, a code chosen from the venue's offered coupons. */
  const apply = async (picked?: string) => {
    const asked = picked ? normalizeFoodCouponCode(picked) : normalized;
    if (busy.current || asked.length < FOOD_ORDER_LIMITS.couponCodeMin) return;
    busy.current = true;
    setApplying(true);
    setError(null);
    setRemoved(false);
    try {
      const preview = await askFoodCoupon(venueId, cart.lines, asked, phone());
      if (preview.ok) {
        cart.applyCoupon({
          code: preview.coupon_code ?? asked,
          coupon_pct: preview.coupon_pct,
          min_order_amount: preview.min_order_amount,
        });
        setCode('');
      } else {
        setError(t(FOOD_COUPON_REJECTION_KEYS[preview.reason ?? 'INVALID']));
      }
    } catch (err) {
      const failure = foodOrderNativeErrorCode(err);
      logs.mobileApp.warn('venueFood', 'previewCoupon', { error: err, code: failure, venueId });
      setError(couponFailureText(failure, t));
    }
    busy.current = false;
    setApplying(false);
  };

  const remove = () => {
    cart.removeCoupon();
    setError(null);
    setRemoved(true);
  };

  return { code, type, applying, canApply: complete && !applying, error, removed, apply, remove };
}

export type FoodCouponBox = ReturnType<typeof useFoodCoupon>;

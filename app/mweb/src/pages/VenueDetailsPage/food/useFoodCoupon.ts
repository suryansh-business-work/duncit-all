import { useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { PHONE_NUMBER } from '@duncit/regex';
import {
  FOOD_COUPON_REJECTION_KEYS,
  FOOD_ORDER_ERROR,
  foodOrderErrorCode,
  foodOrderErrorKey,
  foodOrderLineInputs,
  normalizeFoodCouponCode,
  type VenueFoodCouponPreview,
  type VenueFoodCouponRejection,
} from '@duncit/utils';
import type { AppliedFoodCoupon } from './foodStorage';
import {
  PREVIEW_VENUE_FOOD_COUPON,
  type PreviewVenueFoodCouponData,
  type PreviewVenueFoodCouponVars,
} from './queries';
import type { FoodCart } from './useFoodCart';

/** What the coupon row has to say that the cart's own price does not already. */
export type FoodCouponNotice =
  | { kind: 'rejected'; reason: VenueFoodCouponRejection }
  /** The check itself did not come back; `code` is the server's, '' for a network failure. */
  | { kind: 'failed'; code: string }
  | { kind: 'removed' };

/** Whether Pay may go ahead with the applied code; `notice` says why not, when there is something to say. */
export interface FoodCouponConfirmation {
  proceed: boolean;
  notice: FoodCouponNotice | null;
}

export interface FoodCouponControl {
  applied: AppliedFoodCoupon | null;
  /** Apply was pressed and the server has not answered yet. */
  checking: boolean;
  /** Pay was pressed and the applied code is being checked again. */
  confirming: boolean;
  notice: FoodCouponNotice | null;
  apply: (code: string) => Promise<void>;
  remove: () => void;
  confirm: (phone: string) => Promise<FoodCouponConfirmation>;
  /** The place mutation refused the order over its coupon. */
  reject: (reason: VenueFoodCouponRejection) => void;
}

type Translate = (key: string) => string;

/** The sentence for a notice — the same one in the coupon row and beside the Pay button. */
export function foodCouponNoticeText(notice: FoodCouponNotice, t: Translate): string {
  if (notice.kind === 'rejected') return t(FOOD_COUPON_REJECTION_KEYS[notice.reason]);
  if (notice.kind === 'removed') return t('mweb.venueFood.coupon.removed');
  return notice.code
    ? t(foodOrderErrorKey(notice.code, 'mweb.venueFood.coupon.failed'))
    : t('mweb.venueFood.coupon.failed');
}

const PROCEED: FoodCouponConfirmation = { proceed: true, notice: null };
/** Refusals the place mutation gives too, and the page already reacts to there. */
const PLACE_ANSWERS = new Set<string>([FOOD_ORDER_ERROR.closed, FOOD_ORDER_ERROR.itemUnavailable]);

const isNotice = (answer: VenueFoodCouponPreview | FoodCouponNotice): answer is FoodCouponNotice => 'kind' in answer;

const termsOf = (preview: VenueFoodCouponPreview, code: string): AppliedFoodCoupon => ({
  coupon_code: preview.coupon_code ?? normalizeFoodCouponCode(code),
  coupon_pct: preview.coupon_pct,
  min_order_amount: preview.min_order_amount,
});

/**
 * A venue's coupon on its food cart. The server is asked twice only: when the
 * guest presses Apply, and again when they press Pay — with the mobile number
 * they typed, so a per-person limit is reported before anything is placed. In
 * between, every quantity tap is re-priced locally from the accepted terms.
 *
 * The preview is public, like the place mutation: it goes through the same
 * Apollo client and needs no session.
 */
export function useFoodCoupon(venueId: string, cart: FoodCart, knownPhone: string): FoodCouponControl {
  const client = useApolloClient();
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<FoodCouponNotice | null>(null);
  // A ref, not the state: two taps in one frame both read the state as false.
  const busy = useRef(false);

  // Why a code was refused was said about another cart.
  useEffect(() => {
    setNotice((prev) => (prev?.kind === 'rejected' ? null : prev));
  }, [cart.signature]);

  const check = async (code: string, phone: string): Promise<VenueFoodCouponPreview | FoodCouponNotice> => {
    try {
      const { data } = await client.query<PreviewVenueFoodCouponData, PreviewVenueFoodCouponVars>({
        query: PREVIEW_VENUE_FOOD_COUPON,
        variables: {
          input: {
            venue_id: venueId,
            coupon_code: normalizeFoodCouponCode(code),
            items: foodOrderLineInputs(cart.lines),
            customer_phone: PHONE_NUMBER.test(phone) ? phone : null,
          },
        },
        // A remembered "ok" is exactly the answer that goes stale.
        fetchPolicy: 'no-cache',
      });
      const preview = data?.previewVenueFoodCoupon;
      if (!preview) return { kind: 'failed', code: '' };
      return preview.ok ? preview : { kind: 'rejected', reason: preview.reason ?? 'INVALID' };
    } catch (error) {
      const errorCode = foodOrderErrorCode(error);
      logs.mWeb.warn('venueFood', 'couponPreview', { error, code: errorCode, venueId });
      return { kind: 'failed', code: errorCode };
    }
  };

  const apply = async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    setNotice(null);
    const answer = await check(code, knownPhone);
    if (isNotice(answer)) setNotice(answer);
    else cart.applyCoupon(termsOf(answer, code));
    busy.current = false;
    setChecking(false);
  };

  const remove = () => {
    cart.removeCoupon();
    setNotice({ kind: 'removed' });
  };

  const confirm = async (phone: string): Promise<FoodCouponConfirmation> => {
    const applied = cart.coupon;
    // Nothing to ask: no code, or one this cart no longer earns — that order goes without it, at the price shown.
    if (!applied || cart.price.couponUnmet) return PROCEED;
    if (busy.current) return { proceed: false, notice: null };
    busy.current = true;
    setConfirming(true);
    const answer = await check(applied.coupon_code, phone);
    busy.current = false;
    setConfirming(false);
    if (!isNotice(answer)) {
      const terms = termsOf(answer, applied.coupon_code);
      if (terms.coupon_pct === applied.coupon_pct && terms.min_order_amount === applied.min_order_amount) return PROCEED;
      // The venue changed the code since it was applied: the cart re-prices and
      // the guest presses Pay again, on the total they can now see.
      cart.applyCoupon(terms);
      return { proceed: false, notice: null };
    }
    if (answer.kind === 'failed' && PLACE_ANSWERS.has(answer.code)) return PROCEED;
    setNotice(answer);
    return { proceed: false, notice: answer };
  };

  const reject = (reason: VenueFoodCouponRejection) => setNotice({ kind: 'rejected', reason });

  return { applied: cart.coupon, checking, confirming, notice, apply, remove, confirm, reject };
}

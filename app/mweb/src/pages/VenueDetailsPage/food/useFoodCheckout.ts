import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  FOOD_COUPON_REJECTION_KEYS,
  FOOD_ORDER_CONFLICT_RETRY_MS,
  FOOD_ORDER_ERROR,
  FOOD_ORDER_GENERIC_ERROR_KEY,
  PAYMENT_FAILURE_KEYS,
  classifyPaymentFailure,
  createFoodClientKey,
  foodCouponRejectionOf,
  foodOrderErrorCode,
  foodOrderErrorKey,
  parseApiError,
  tryPlaceFoodOrder,
  wait,
  type PlaceVenueFoodOrderInput,
  type RazorpayErrorLike,
  type VenueFoodCouponRejection,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { openRazorpayCheckout, type RazorpaySignature } from '../../checkout-page/razorpayCheckout';
import { saveFoodOrder } from './foodStorage';
import { PLACE_VENUE_FOOD_ORDER, VERIFY_VENUE_FOOD_ORDER, type PlaceVenueFoodOrderData } from './queries';

export interface FoodCheckoutError {
  title: string | null;
  message: string;
}

/** A coupon the server will not take: why, then what the guest can do about it. Nothing was placed. */
export const foodCouponRefusal = (reason: VenueFoodCouponRejection, t: (key: string) => string): FoodCheckoutError => ({
  title: t(FOOD_COUPON_REJECTION_KEYS[reason]),
  message: t('mweb.venueFood.errors.couponRejected'),
});

interface Options {
  /** The order is paid, or its payment is still being confirmed — either way the order page takes over from here. */
  onDone: (placement: VenueFoodOrderPlacement) => void;
  /** The server refused the order, by its code — the menu refetches or closes its cart on it. */
  onRefused?: (code: string, error: unknown) => void;
}

/**
 * One key per checkout attempt. The same cart and details get the same key, so
 * a second tap or a retry after a closed sheet reaches the SAME order on the
 * server; a changed cart, or a finished order, gets a new one.
 */
export function useFoodClientKey() {
  const [clientKey] = useState(() => createFoodClientKey(() => globalThis.crypto.randomUUID()));
  return clientKey;
}

/**
 * Place a food order and take its payment: place → the venue's Razorpay sheet
 * → verify. Used by the menu's cart and by the order page's "Retry payment",
 * which repeats the placement with the key it was first made with.
 *
 * A closed or declined sheet leaves everything as it was, to try again. A
 * payment whose outcome is unknown — a gateway timeout, or a verify call that
 * never came back — hands over to the order page, which re-reads the order
 * until the server has settled it with Razorpay.
 */
export function useFoodCheckout({ onDone, onRefused }: Readonly<Options>) {
  const { t } = useTranslation();
  const [placeOrder] = useMutation<PlaceVenueFoodOrderData>(PLACE_VENUE_FOOD_ORDER);
  const [verifyPayment] = useMutation(VERIFY_VENUE_FOOD_ORDER);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FoodCheckoutError | null>(null);
  // Razorpay's sheet is on screen. A page dialog left open under it keeps
  // pulling focus back out of the sheet's fields, so callers hide theirs.
  const [gatewayOpen, setGatewayOpen] = useState(false);
  // A ref, not the state: two taps in one frame both read `submitting` as false.
  const busy = useRef(false);

  const release = () => {
    busy.current = false;
    setGatewayOpen(false);
    setSubmitting(false);
  };

  const finish = (placement: VenueFoodOrderPlacement, clientKey: string) => {
    saveFoodOrder({
      order_id: placement.order.id,
      venue_id: placement.order.venue_id,
      order_no: placement.order.order_no,
      access_key: placement.access_key,
      client_key: clientKey,
    });
    release();
    onDone(placement);
  };

  const place = async (input: PlaceVenueFoodOrderInput) => {
    try {
      const res = await placeOrder({ variables: { input } });
      return res.data?.placeVenueFoodOrder ?? null;
    } catch (err) {
      if (foodOrderErrorCode(err) !== FOOD_ORDER_ERROR.conflict) throw err;
      // The first tap's order is still opening its payment — the same key reads it a moment later.
      await wait(FOOD_ORDER_CONFLICT_RETRY_MS);
      const res = await placeOrder({ variables: { input } });
      return res.data?.placeVenueFoodOrder ?? null;
    }
  };

  const refuse = (err: unknown, venueId: string) => {
    const code = foodOrderErrorCode(err);
    logs.mWeb.warn('venueFood', 'place', { error: err, code, venueId });
    const generic = t(FOOD_ORDER_GENERIC_ERROR_KEY);
    if (code === FOOD_ORDER_ERROR.couponRejected) setError(foodCouponRefusal(foodCouponRejectionOf(err) ?? 'INVALID', t));
    else setError({ title: null, message: code ? t(foodOrderErrorKey(code)) : parseApiError(err, generic) });
    release();
    if (code) onRefused?.(code, err);
  };

  const confirm = async (placement: VenueFoodOrderPlacement, clientKey: string, sig: RazorpaySignature) => {
    setGatewayOpen(false);
    try {
      await verifyPayment({
        variables: { input: { order_id: placement.order.id, access_key: placement.access_key, ...sig } },
      });
    } catch (err) {
      // Not the last word: the order page re-reads the order, and every read
      // has the server ask Razorpay again.
      logs.mWeb.warn('venueFood', 'verify', { error: err, orderId: placement.order.id });
    }
    finish(placement, clientKey);
  };

  const failed = (placement: VenueFoodOrderPlacement, clientKey: string, raw: RazorpayErrorLike | null) => {
    const failure = classifyPaymentFailure(raw);
    logs.mWeb.warn('venueFood', 'payment', {
      kind: failure.kind,
      code: failure.code,
      reason: failure.description,
      orderId: placement.order.id,
    });
    // Money may have moved: the order page is where that gets settled.
    if (failure.kind === 'TIMEOUT') {
      finish(placement, clientKey);
      return;
    }
    const keys = PAYMENT_FAILURE_KEYS[failure.kind];
    setError({ title: t(keys.title), message: t(keys.body) });
    release();
  };

  const openSheet = async (placement: VenueFoodOrderPlacement, clientKey: string) => {
    const sheet = placement.razorpay;
    if (!sheet) {
      finish(placement, clientKey);
      return;
    }
    // The hosted sheet covers the page from here; `busy` holds until it answers.
    setGatewayOpen(true);
    try {
      await openRazorpayCheckout(sheet, {
        onSuccess: (sig) => confirm(placement, clientKey, sig),
        onFailure: (raw) => failed(placement, clientKey, raw),
      });
    } catch (err) {
      logs.mWeb.error('venueFood', 'openSheet', { error: err, orderId: placement.order.id });
      setError({ title: null, message: t('mweb.checkout.errorStart') });
      release();
    }
  };

  const start = async (input: PlaceVenueFoodOrderInput) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    const { placement, error: refusal } = await tryPlaceFoodOrder(() => place(input));
    if (placement) await openSheet(placement, input.client_key);
    else refuse(refusal, input.venue_id);
  };

  const clearError = useCallback(() => setError(null), []);

  // `fail` shows a refusal reached before the order was sent — the coupon's check at Pay.
  return { submitting, gatewayOpen, error, start, fail: setError, clearError };
}

import { useCallback, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { logs } from '@duncit/logs';
import {
  FOOD_ORDER_ERROR,
  FOOD_ORDER_GENERIC_ERROR_KEY,
  PAYMENT_FAILURE_KEYS,
  classifyPaymentFailure,
  foodOrderErrorKey,
  parseApiError,
  type PlaceVenueFoodOrderInput,
  type RazorpayErrorLike,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

import type { RazorpaySignature } from '@/hooks/useCheckout';
import { useTranslation } from '@/hooks/useTranslation';
import {
  foodOrderNativeErrorCode,
  placeFoodOrder,
  verifyFoodOrderPayment,
} from '@/services/food-order';
import { saveFoodOrder } from '@/services/food-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

export interface FoodCheckoutError {
  title: string | null;
  message: string;
}

interface Options {
  /** The order is paid, or its payment is still being confirmed — either way the order screen takes over from here. */
  onDone: (placement: VenueFoodOrderPlacement) => void;
  /** The server refused the order, by its code — the menu refetches or closes its cart on it. */
  onRefused?: (code: string) => void;
}

/** The attempt whose payment sheet is on screen. */
interface Attempt {
  placement: VenueFoodOrderPlacement;
  clientKey: string;
}

/** How long to wait before repeating a placement the server said is still being set up. */
const CONFLICT_RETRY_MS = 1500;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * One key per checkout attempt. The same cart and details get the same key, so
 * a second tap or a retry after a closed sheet reaches the SAME order on the
 * server; a changed cart, or a finished order, gets a new one.
 */
export function useFoodClientKey() {
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const keyFor = useCallback((signature: string) => {
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: randomUUID() };
    }
    return attempt.current.key;
  }, []);
  const reset = useCallback(() => {
    attempt.current = null;
  }, []);
  return { keyFor, reset };
}

async function place(input: PlaceVenueFoodOrderInput) {
  try {
    return await placeFoodOrder(input);
  } catch (err) {
    if (foodOrderNativeErrorCode(err) !== FOOD_ORDER_ERROR.conflict) throw err;
    // The first tap's order is still opening its payment — the same key reads it a moment later.
    await wait(CONFLICT_RETRY_MS);
    return placeFoodOrder(input);
  }
}

/**
 * Place a food order and take its payment: place → the venue's Razorpay sheet
 * → verify. Used by the menu's cart and by the order screen's "Retry payment",
 * which repeats the placement with the key it was first made with. RN twin of
 * mWeb's food/useFoodCheckout; the sheet here is <RazorpayWebView>, which the
 * caller renders with `gateway`.
 *
 * A closed or declined sheet leaves everything as it was, to try again. A
 * payment whose outcome is unknown — a gateway timeout, or a verify call that
 * never came back — hands over to the order screen, which re-reads the order
 * until the server has settled it with Razorpay.
 */
export function useFoodCheckout({ onDone, onRefused }: Readonly<Options>) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FoodCheckoutError | null>(null);
  // Set while Razorpay's sheet is on screen; callers hide their own sheet under it.
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  // A ref, not the state: two taps in one frame both read `submitting` as false.
  const busy = useRef(false);

  const release = () => {
    busy.current = false;
    setAttempt(null);
    setSubmitting(false);
  };

  const finish = async ({ placement, clientKey }: Attempt) => {
    // Remembered before the order screen opens, so it finds the key to retry with.
    await saveFoodOrder({
      order_id: placement.order.id,
      venue_id: placement.order.venue_id,
      order_no: placement.order.order_no,
      access_key: placement.access_key,
      client_key: clientKey,
    });
    release();
    onDone(placement);
  };

  const refuse = (err: unknown, venueId: string) => {
    const code = foodOrderNativeErrorCode(err);
    logs.mobileApp.warn('venueFood', 'place', { error: err, code, venueId });
    const generic = t(FOOD_ORDER_GENERIC_ERROR_KEY);
    setError({
      title: null,
      message: code ? t(foodOrderErrorKey(code)) : parseApiError(err, generic),
    });
    release();
    if (code) onRefused?.(code);
  };

  const confirm = async (current: Attempt, sig: RazorpaySignature) => {
    const { placement } = current;
    setAttempt(null);
    try {
      await verifyFoodOrderPayment({
        order_id: placement.order.id,
        access_key: placement.access_key,
        ...sig,
      });
    } catch (err) {
      // Not the last word: the order screen re-reads the order, and every read
      // has the server ask Razorpay again.
      logs.mobileApp.warn('venueFood', 'verify', { error: err, orderId: placement.order.id });
    }
    await finish(current);
  };

  const failed = async (current: Attempt, raw: RazorpayErrorLike | null) => {
    const failure = classifyPaymentFailure(raw);
    logs.mobileApp.warn('venueFood', 'payment', {
      kind: failure.kind,
      code: failure.code,
      reason: failure.description,
      orderId: current.placement.order.id,
    });
    // Money may have moved: the order screen is where that gets settled.
    if (failure.kind === 'TIMEOUT') {
      await finish(current);
      return;
    }
    const keys = PAYMENT_FAILURE_KEYS[failure.kind];
    setError({ title: t(keys.title), message: t(keys.body) });
    release();
  };

  const start = async (input: PlaceVenueFoodOrderInput) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    let placement: VenueFoodOrderPlacement | null;
    try {
      placement = await place(input);
    } catch (err) {
      refuse(err, input.venue_id);
      return;
    }
    if (!placement) {
      refuse(null, input.venue_id);
      return;
    }
    const next = { placement, clientKey: input.client_key };
    // No sheet: the order is no longer waiting for payment.
    if (placement.razorpay) setAttempt(next);
    else await finish(next);
  };

  const clearError = useCallback(() => setError(null), []);

  // The sheet answers once; a second message for the same attempt finds none.
  const onSuccess = (sig: RazorpaySignature) => {
    if (attempt) fireAndForget(confirm(attempt, sig));
  };
  const onFailure = (raw: RazorpayErrorLike | null) => {
    if (attempt) fireAndForget(failed(attempt, raw));
  };

  return {
    submitting,
    gatewayOpen: !!attempt,
    error,
    start,
    clearError,
    /** Spread onto <RazorpayWebView>: the venue's payment sheet, open while an attempt waits on it. */
    gateway: {
      order: attempt?.placement.razorpay ?? null,
      open: !!attempt,
      onSuccess,
      onFailure,
    },
  };
}

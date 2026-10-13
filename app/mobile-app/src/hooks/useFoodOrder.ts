import { useCallback, useEffect, useRef, useState } from 'react';
import { logs } from '@duncit/logs';
import { foodOrderPollMs, isFoodOrderFinished, type VenueFoodOrder } from '@duncit/utils';

import { useRefreshRegistration } from '@/components/PullToRefresh';
import { fetchFoodOrder, foodOrderNativeErrorCode } from '@/services/food-order';
import { readFoodOrder, saveFoodOrder, type StoredFoodOrder } from '@/services/food-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * One food order, kept fresh. The access key comes from the link or, on the
 * device that placed the order, from what it remembered; the member's own
 * order opens without either. The read repeats while anything can still change
 * — quickly while the payment is unconfirmed (each read has the server recheck
 * Razorpay), slowly while the kitchen works — and stops once the order is
 * served or cancelled. RN twin of mWeb's venue-food-order-page/useFoodOrder.
 */
export function useFoodOrder(orderId: string, linkKey: string | null) {
  // `undefined` until the device's memory of the order has been read.
  const [stored, setStored] = useState<StoredFoodOrder | null | undefined>(undefined);
  const [order, setOrder] = useState<VenueFoodOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // Only the latest read may answer: a slow one must not overwrite a newer one.
  const latest = useRef(0);

  useEffect(() => {
    let active = true;
    setStored(undefined);
    setOrder(null);
    setLoading(true);
    fireAndForget(
      readFoodOrder(orderId).then((found) => {
        if (active) setStored(found);
      }),
    );
    return () => {
      active = false;
      latest.current += 1;
    };
  }, [orderId]);

  const ready = stored !== undefined;
  const accessKey = linkKey || stored?.access_key || null;

  const load = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    latest.current += 1;
    const turn = latest.current;
    try {
      const next = await fetchFoodOrder(orderId, accessKey);
      if (turn !== latest.current) return;
      setOrder(next);
      setError(null);
    } catch (err) {
      if (turn !== latest.current) return;
      logs.mobileApp.warn('venueFood', 'readOrder', {
        error: err,
        orderId,
        code: foodOrderNativeErrorCode(err),
      });
      // A failed re-read must not blank an order already on screen.
      setError(err);
    }
    setLoading(false);
  }, [orderId, accessKey]);

  useEffect(() => {
    if (ready) fireAndForget(load());
  }, [ready, load]);

  // The screen's pull gesture re-reads the order too.
  useRefreshRegistration(load);

  const pollMs = foodOrderPollMs(order);
  useEffect(() => {
    if (!ready || !pollMs) return undefined;
    const timer = setInterval(() => fireAndForget(load()), pollMs);
    return () => clearInterval(timer);
  }, [ready, pollMs, load]);

  // Keep the order on this device — also for one opened from a link — and mark
  // it finished so the menu stops offering to track it.
  const finished = order ? isFoodOrderFinished(order) : false;
  const venueId = order?.venue_id;
  const orderNo = order?.order_no;
  useEffect(() => {
    if (!venueId || !orderNo || !accessKey) return;
    fireAndForget(
      saveFoodOrder({
        order_id: orderId,
        venue_id: venueId,
        order_no: orderNo,
        access_key: accessKey,
        client_key: '',
        finished,
      }),
    );
  }, [orderId, venueId, orderNo, accessKey, finished]);

  return {
    order,
    loading: loading && !order,
    /** Only an error with nothing to show — a failed re-read keeps the order on screen. */
    error: order ? null : error,
    errorCode: order || !error ? '' : foodOrderNativeErrorCode(error),
    /** The key the order is read with — what its invoice and its rating are asked for with too. */
    accessKey,
    /** The key the order was placed with, when this device placed it — what "Retry payment" repeats. */
    clientKey: stored?.client_key ?? '',
    refetch: load,
  };
}

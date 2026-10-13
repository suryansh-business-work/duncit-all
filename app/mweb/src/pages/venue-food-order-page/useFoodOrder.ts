import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router';
import { logs } from '@duncit/logs';
import { foodOrderErrorCode, foodOrderPollMs, isFoodOrderFinished, type VenueFoodOrder } from '@duncit/utils';
import { readFoodOrder, saveFoodOrder } from '../VenueDetailsPage/food/foodStorage';
import { VENUE_FOOD_ORDER, type VenueFoodOrderData } from '../VenueDetailsPage/food/queries';

/** The query param the order's access key rides in. */
const KEY_PARAM = 'key';

/**
 * One guest order, kept fresh. The access key comes from the link or, on the
 * device that placed the order, from what it remembered; a signed-in guest's
 * own order opens without either. The read repeats while anything can still
 * change — quickly while the payment is unconfirmed (each read has the server
 * recheck Razorpay), slowly while the kitchen works — and stops once the order
 * is served or cancelled.
 */
export function useFoodOrder(orderId: string) {
  const [params] = useSearchParams();
  const stored = useMemo(() => readFoodOrder(orderId), [orderId]);
  const accessKey = params.get(KEY_PARAM) || stored?.access_key || null;

  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<VenueFoodOrderData>(VENUE_FOOD_ORDER, {
    variables: { orderId, accessKey },
    skip: !orderId,
    fetchPolicy: 'cache-and-network',
  });

  // A failed re-read must not blank an order already on screen.
  const lastOrder = useRef<VenueFoodOrder | null>(null);
  if (data?.venueFoodOrder) lastOrder.current = data.venueFoodOrder;
  const order = data?.venueFoodOrder ?? (error ? lastOrder.current : null);

  const pollMs = foodOrderPollMs(order);
  useEffect(() => {
    if (!pollMs) return undefined;
    startPolling(pollMs);
    return () => stopPolling();
  }, [pollMs, startPolling, stopPolling]);

  useEffect(() => {
    if (error) logs.mWeb.warn('venueFood', 'readOrder', { error, orderId, code: foodOrderErrorCode(error) });
  }, [error, orderId]);

  // Keep the order on this device — also for one opened from a link — and mark
  // it finished so the menu stops offering to track it.
  const finished = order ? isFoodOrderFinished(order) : false;
  const venueId = order?.venue_id;
  const orderNo = order?.order_no;
  useEffect(() => {
    if (!venueId || !orderNo || !accessKey) return;
    saveFoodOrder({ order_id: orderId, venue_id: venueId, order_no: orderNo, access_key: accessKey, client_key: '', finished });
  }, [orderId, venueId, orderNo, accessKey, finished]);

  return {
    order,
    loading: loading && !order,
    /** Only an error with nothing to show — a failed re-read keeps the order on screen. */
    error: order ? undefined : error,
    errorCode: order ? '' : foodOrderErrorCode(error),
    /** The key the order was placed with, when this device placed it — what "Retry payment" repeats. */
    clientKey: stored?.client_key ?? '',
    refetch,
  };
}

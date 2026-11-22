/**
 * A member's gift card order, as mWeb and the native app show it: the words
 * for each status and the steps of its progress. One copy for both apps
 * (rules 27 and 40) — the screens differ, the story an order tells does not.
 */

export type GiftCardOrderDeliveryMode = 'DIGITAL' | 'PHYSICAL';
export type GiftCardOrderPayment = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type GiftCardOrderFulfilment =
  | 'PENDING'
  | 'PROCESSING'
  | 'PRINTED'
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'NDR'
  | 'RTO'
  | 'RTO_DELIVERED'
  | 'LOST'
  | 'CANCELLED'
  | 'FAILED';

export interface GiftCardOrderStatusFacts {
  delivery_mode: GiftCardOrderDeliveryMode;
  payment_status: GiftCardOrderPayment;
  fulfilment_status: GiftCardOrderFulfilment;
}

/** What the member reads for each fulfilment status (literal keys for the localization gate). */
export const GIFT_CARD_ORDER_STATUS_KEYS: Record<GiftCardOrderFulfilment, string> = {
  PENDING: 'mweb.giftCards.orderStatusPending',
  PROCESSING: 'mweb.giftCards.orderStatusProcessing',
  PRINTED: 'mweb.giftCards.orderStatusPrinted',
  AWAITING_SHIPMENT: 'mweb.giftCards.orderStatusPacked',
  AWB_ASSIGNED: 'mweb.giftCards.orderStatusPacked',
  PICKUP_SCHEDULED: 'mweb.giftCards.orderStatusPacked',
  SHIPPED: 'mweb.giftCards.orderStatusShipped',
  OUT_FOR_DELIVERY: 'mweb.giftCards.orderStatusOutForDelivery',
  DELIVERED: 'mweb.giftCards.orderStatusDelivered',
  NDR: 'mweb.giftCards.orderStatusAttemptFailed',
  RTO: 'mweb.giftCards.orderStatusReturning',
  RTO_DELIVERED: 'mweb.giftCards.orderStatusReturned',
  LOST: 'mweb.giftCards.orderStatusLost',
  CANCELLED: 'mweb.giftCards.orderStatusCancelled',
  FAILED: 'mweb.giftCards.orderStatusFailed',
};

export const GIFT_CARD_ORDER_PAYMENT_KEYS: Record<GiftCardOrderPayment, string> = {
  PENDING: 'mweb.giftCards.paymentPending',
  PAID: 'mweb.giftCards.paymentPaid',
  FAILED: 'mweb.giftCards.paymentFailed',
  REFUNDED: 'mweb.giftCards.paymentRefunded',
};

export type GiftCardOrderTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

/** The order's headline: the payment while it is not paid, otherwise where the cards are. */
export function giftCardOrderHeadline(order: GiftCardOrderStatusFacts): { key: string; tone: GiftCardOrderTone } {
  if (order.payment_status !== 'PAID') {
    const tone: GiftCardOrderTone = order.payment_status === 'PENDING' ? 'neutral' : 'error';
    return { key: GIFT_CARD_ORDER_PAYMENT_KEYS[order.payment_status], tone };
  }
  const status = order.fulfilment_status;
  if (status === 'DELIVERED') return { key: GIFT_CARD_ORDER_STATUS_KEYS[status], tone: 'success' };
  if (status === 'NDR') return { key: GIFT_CARD_ORDER_STATUS_KEYS[status], tone: 'warning' };
  if (['RTO', 'RTO_DELIVERED', 'LOST', 'CANCELLED', 'FAILED'].includes(status)) {
    return { key: GIFT_CARD_ORDER_STATUS_KEYS[status], tone: 'error' };
  }
  return { key: GIFT_CARD_ORDER_STATUS_KEYS[status], tone: 'info' };
}

export interface GiftCardOrderStep {
  id: 'PLACED' | 'PAID' | 'EMAILED' | 'PRINTED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  labelKey: string;
  done: boolean;
}

/** How far along each step a fulfilment status is (a printed order's ladder). */
const PHYSICAL_RANK: Record<GiftCardOrderFulfilment, number> = {
  PENDING: 0,
  PROCESSING: 0,
  PRINTED: 1,
  AWAITING_SHIPMENT: 1,
  AWB_ASSIGNED: 1,
  PICKUP_SCHEDULED: 1,
  SHIPPED: 2,
  NDR: 2,
  RTO: 2,
  RTO_DELIVERED: 2,
  LOST: 2,
  CANCELLED: 0,
  FAILED: 0,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

/**
 * The progress steps: placed → paid, then emailed for a digital order, or
 * printed → shipped → out for delivery → delivered for a printed one.
 */
export function giftCardOrderSteps(order: GiftCardOrderStatusFacts): GiftCardOrderStep[] {
  const paid = order.payment_status === 'PAID' || order.payment_status === 'REFUNDED';
  const steps: GiftCardOrderStep[] = [
    { id: 'PLACED', labelKey: 'mweb.giftCards.stepPlaced', done: true },
    { id: 'PAID', labelKey: 'mweb.giftCards.stepPaid', done: paid },
  ];
  if (order.delivery_mode === 'DIGITAL') {
    steps.push({ id: 'EMAILED', labelKey: 'mweb.giftCards.stepEmailed', done: paid && order.fulfilment_status === 'DELIVERED' });
    return steps;
  }
  const rank = paid ? PHYSICAL_RANK[order.fulfilment_status] : 0;
  steps.push(
    { id: 'PRINTED', labelKey: 'mweb.giftCards.stepPrinted', done: rank >= 1 },
    { id: 'SHIPPED', labelKey: 'mweb.giftCards.stepShipped', done: rank >= 2 },
    { id: 'OUT_FOR_DELIVERY', labelKey: 'mweb.giftCards.stepOutForDelivery', done: rank >= 3 },
    { id: 'DELIVERED', labelKey: 'mweb.giftCards.stepDelivered', done: rank >= 4 }
  );
  return steps;
}

const AT_REST: readonly GiftCardOrderFulfilment[] = ['DELIVERED', 'RTO_DELIVERED', 'LOST', 'CANCELLED', 'FAILED'];

/**
 * Still moving — worth re-reading while the member watches: a payment not yet
 * settled, or a paid order whose cards have not arrived anywhere final.
 */
export function isGiftCardOrderLive(order: GiftCardOrderStatusFacts): boolean {
  if (order.payment_status === 'PENDING') return true;
  if (order.payment_status !== 'PAID') return false;
  return !AT_REST.includes(order.fulfilment_status);
}

/** How often an open order page re-reads a live order (ms). */
export const GIFT_CARD_ORDER_POLL_MS = 30_000;

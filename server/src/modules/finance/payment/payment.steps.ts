import type { PaymentStepKey } from './payment.model';

/**
 * The one catalogue of finalization steps: their order, their labels, and which
 * part of checkout each belongs to.
 *
 * The order and the labels used to be written twice — once in the finalizer
 * that records the steps, once in the audit service that renders them — so the
 * two could name the same step differently, and inserting a step in one file
 * silently reordered nothing in the other.
 */

/** The three things a checkout can buy, plus the work every checkout does.
 * Finance's detail page draws one tab per purchase kind and reads PAYMENT
 * alongside all three, because the money, the invoice and the receipt belong to
 * the payment rather than to whatever it bought. */
export type PaymentSegment = 'PAYMENT' | 'POD' | 'PRODUCT' | 'GIFT_CARD';

/** Execution order — the audit trail reads top to bottom in this order. */
export const STEP_ORDER: PaymentStepKey[] = [
  'PAYMENT_CAPTURED',
  'INVOICE_NUMBER',
  'SEATS_CLAIMED',
  'MEMBERSHIP',
  'TICKET',
  'LEADERBOARD_POINTS',
  'PRODUCT_ORDERS',
  'STOCK_ADJUSTED',
  'GIFT_CARD_ISSUED',
  'COUPON_REDEEMED',
  'COINS_REDEEMED',
  'COINS_EARNED',
  'BACKOUT_FILL',
  'LINK_ATTRIBUTION',
  'TICKET_EMAIL',
  'INVOICE_PDF',
  'RECEIPT_EMAIL',
  'GIFT_CARD_EMAIL',
  'SHIPMENT',
  'PAYMENT_FAILED_NOTICE',
];

export const STEP_LABELS: Record<PaymentStepKey, string> = {
  PAYMENT_CAPTURED: 'Payment captured',
  INVOICE_NUMBER: 'Invoice number issued',
  SEATS_CLAIMED: 'Seats claimed on the pod',
  MEMBERSHIP: 'Booking created',
  TICKET: 'Entry ticket issued',
  LEADERBOARD_POINTS: 'Leaderboard points awarded',
  PRODUCT_ORDERS: 'Product orders created',
  STOCK_ADJUSTED: 'Stock adjusted',
  GIFT_CARD_ISSUED: 'Gift card issued',
  COUPON_REDEEMED: 'Coupon redemption counted',
  COINS_REDEEMED: 'Duncit Coins spent',
  COINS_EARNED: 'Duncit Coins earned',
  BACKOUT_FILL: 'Backout spot filled',
  LINK_ATTRIBUTION: 'Marketing attribution',
  TICKET_EMAIL: 'Entry ticket e-mailed',
  INVOICE_PDF: 'Invoice PDF generated',
  RECEIPT_EMAIL: 'Receipt e-mailed',
  GIFT_CARD_EMAIL: 'Gift card e-mailed',
  SHIPMENT: 'Shipment booked',
  PAYMENT_FAILED_NOTICE: 'Buyer told the payment failed',
};

/** Which tab of the Finance detail page each step is filed under. */
export const STEP_SEGMENTS: Record<PaymentStepKey, PaymentSegment> = {
  PAYMENT_CAPTURED: 'PAYMENT',
  INVOICE_NUMBER: 'PAYMENT',
  SEATS_CLAIMED: 'POD',
  MEMBERSHIP: 'POD',
  TICKET: 'POD',
  LEADERBOARD_POINTS: 'POD',
  BACKOUT_FILL: 'POD',
  TICKET_EMAIL: 'POD',
  PRODUCT_ORDERS: 'PRODUCT',
  STOCK_ADJUSTED: 'PRODUCT',
  SHIPMENT: 'PRODUCT',
  GIFT_CARD_ISSUED: 'GIFT_CARD',
  GIFT_CARD_EMAIL: 'GIFT_CARD',
  COUPON_REDEEMED: 'PAYMENT',
  COINS_REDEEMED: 'PAYMENT',
  COINS_EARNED: 'PAYMENT',
  LINK_ATTRIBUTION: 'PAYMENT',
  INVOICE_PDF: 'PAYMENT',
  RECEIPT_EMAIL: 'PAYMENT',
  PAYMENT_FAILED_NOTICE: 'PAYMENT',
};

/** The pod leg's core steps — all skipped together on a payment with no pod. */
export const POD_STEP_KEYS: PaymentStepKey[] = [
  'SEATS_CLAIMED',
  'MEMBERSHIP',
  'TICKET',
  'LEADERBOARD_POINTS',
];

/**
 * The steps that run AFTER the booking core has committed — and so the only
 * ones that can be re-run on their own.
 *
 * Everything else moves inside one transaction: there is no way to redo the
 * membership without redoing the seat and the ticket beside it, which is why a
 * broken core is re-run whole rather than row by row.
 */
export const DEFERRED_STEP_KEYS: PaymentStepKey[] = [
  'BACKOUT_FILL',
  'LINK_ATTRIBUTION',
  'TICKET_EMAIL',
  'INVOICE_PDF',
  'RECEIPT_EMAIL',
  'GIFT_CARD_EMAIL',
  'SHIPMENT',
];

const DEFERRED = new Set<string>(DEFERRED_STEP_KEYS);

export const isDeferredStep = (key: string): key is PaymentStepKey => DEFERRED.has(key);

/**
 * The invoice PDF and the receipt that attaches it are one unit of work: the
 * mail cannot go without the document, so re-running either re-runs both.
 */
const STEP_PAIRS: Partial<Record<PaymentStepKey, PaymentStepKey>> = {
  RECEIPT_EMAIL: 'INVOICE_PDF',
  INVOICE_PDF: 'RECEIPT_EMAIL',
};

/** Widen a retry selection to whole units of work. */
export function withPairedSteps(keys: readonly PaymentStepKey[]): PaymentStepKey[] {
  const out = new Set<PaymentStepKey>(keys);
  for (const key of keys) {
    const partner = STEP_PAIRS[key];
    if (partner) out.add(partner);
  }
  return DEFERRED_STEP_KEYS.filter((key) => out.has(key));
}

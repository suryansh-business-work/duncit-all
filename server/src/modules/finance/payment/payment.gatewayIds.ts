/**
 * The ids Razorpay's own dashboard shows for a payment row — read in one place so
 * every Finance, Admin and Loyalty screen prints (and searches) exactly the ids
 * a person sees at Razorpay.
 *
 * Our own `payment_id` is a Duncit reference. Rows created before the
 * DPAY- format carry a `pay_…` reference that LOOKS like a Razorpay payment id
 * but is not one — which is why screens that printed it as "Payment ID" never
 * matched the dashboard. The real ids live on the row:
 *  - order id: `metadata.razorpay_order_id`, else `gateway_ref` while it still
 *    holds the order (a checkout nobody has paid yet);
 *  - payment id: `metadata.razorpay_payment_id`, else `gateway_ref` once a
 *    verify or the capture adopter moved the payment id there;
 *  - refund ids: `metadata.razorpay_refund_ids`, stamped by every flow that
 *    sends a refund through Razorpay (recordPaymentRefund).
 */
import type { IPayment } from './payment.model';

type GatewayFacts = Pick<IPayment, 'gateway_ref' | 'metadata'> & Partial<Pick<IPayment, 'gateway'>>;

export interface RazorpayIds {
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_refund_ids: string[];
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** The Razorpay ORDER id of a payment, or '' when it never had one. */
export function razorpayOrderIdOf(doc: GatewayFacts): string {
  const fromMeta = text(doc.metadata?.razorpay_order_id);
  if (fromMeta) return fromMeta;
  return doc.gateway_ref?.startsWith('order_') ? doc.gateway_ref : '';
}

/** The Razorpay PAYMENT id of a payment, or '' when nobody has paid it yet. */
export function razorpayPaymentIdOf(doc: GatewayFacts): string {
  const fromMeta = text(doc.metadata?.razorpay_payment_id);
  if (fromMeta) return fromMeta;
  return doc.gateway_ref?.startsWith('pay_') ? doc.gateway_ref : '';
}

/** Every Razorpay refund id recorded against the payment, oldest first. */
export function razorpayRefundIdsOf(doc: GatewayFacts): string[] {
  const ids = doc.metadata?.razorpay_refund_ids;
  return Array.isArray(ids) ? ids.map(text).filter(Boolean) : [];
}

/** All three, as the GraphQL rows carry them. A non-Razorpay payment has none. */
export function razorpayIdsOf(doc: GatewayFacts): RazorpayIds {
  if (doc.gateway && doc.gateway !== 'RAZORPAY') {
    return { razorpay_payment_id: null, razorpay_order_id: null, razorpay_refund_ids: [] };
  }
  return {
    razorpay_payment_id: razorpayPaymentIdOf(doc) || null,
    razorpay_order_id: razorpayOrderIdOf(doc) || null,
    razorpay_refund_ids: razorpayRefundIdsOf(doc),
  };
}

/**
 * The stored paths a table's free-text search must also match, so a Razorpay
 * id copied from the dashboard (or from a buyer's bank SMS) finds its row.
 */
export const RAZORPAY_ID_SEARCH_FIELDS = [
  'gateway_ref',
  'metadata.razorpay_payment_id',
  'metadata.razorpay_order_id',
  'metadata.razorpay_refund_ids',
] as const;

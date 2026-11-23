import { Types } from 'mongoose';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { RAZORPAY_ID_SEARCH_FIELDS, razorpayIdsOf } from '@modules/finance/payment/payment.gatewayIds';

/**
 * Which payment a pasted id names, and through which of its ids. Pure, so the
 * matching rule is tested without a database.
 *
 * One id can be several things at once: a payment made before the DPAY- format
 * carries a Duncit ref shaped like `pay_…`, which looks like a Razorpay payment
 * id but is not one. So a match never guesses the kind from the shape — it
 * names every field of the payment the id is equal to.
 */

export const TRACE_MATCHES = [
  'DUNCIT_REF',
  'INVOICE',
  'DOCUMENT_ID',
  'RAZORPAY_PAYMENT',
  'RAZORPAY_ORDER',
  'RAZORPAY_REFUND',
] as const;
export type TraceMatch = (typeof TRACE_MATCHES)[number];

/** The most payments one id may resolve to; a real id names one or two. */
export const TRACE_PAYMENT_LIMIT = 20;

type MatchFacts = Pick<IPayment, 'payment_id' | 'invoice_no' | 'gateway' | 'gateway_ref' | 'metadata'> & { _id: Types.ObjectId };

/** Every field of the payment the id is exactly equal to. */
export function matchedOn(payment: MatchFacts, ref: string): TraceMatch[] {
  const ids = razorpayIdsOf(payment);
  const found: TraceMatch[] = [];
  if (payment.payment_id === ref) found.push('DUNCIT_REF');
  if (payment.invoice_no === ref) found.push('INVOICE');
  if (String(payment._id) === ref) found.push('DOCUMENT_ID');
  if (ids.razorpay_payment_id === ref) found.push('RAZORPAY_PAYMENT');
  if (ids.razorpay_order_id === ref) found.push('RAZORPAY_ORDER');
  if (ids.razorpay_refund_ids.includes(ref)) found.push('RAZORPAY_REFUND');
  return found;
}

/** The Mongo filter for every payment one of whose ids is exactly `ref`. Each branch is indexed. */
export function paymentRefFilter(ref: string): Record<string, unknown> {
  const or: Record<string, unknown>[] = [
    { payment_id: ref },
    { invoice_no: ref },
    ...RAZORPAY_ID_SEARCH_FIELDS.map((path) => ({ [path]: ref })),
  ];
  if (/^[a-f0-9]{24}$/i.test(ref)) or.push({ _id: new Types.ObjectId(ref) });
  return { $or: or };
}

/** The Razorpay ids of a set of payments, deduplicated, as the webhook log stores them. */
export function razorpayIdSets(payments: readonly MatchFacts[], ref: string) {
  const paymentIds = new Set<string>();
  const orderIds = new Set<string>();
  const refundIds = new Set<string>();
  for (const payment of payments) {
    const ids = razorpayIdsOf(payment);
    if (ids.razorpay_payment_id) paymentIds.add(ids.razorpay_payment_id);
    if (ids.razorpay_order_id) orderIds.add(ids.razorpay_order_id);
    ids.razorpay_refund_ids.forEach((id) => refundIds.add(id));
  }
  // An id nothing on our side recorded (a webhook for a payment we never saw) is still looked up.
  if (ref.startsWith('pay_')) paymentIds.add(ref);
  if (ref.startsWith('order_')) orderIds.add(ref);
  if (ref.startsWith('rfnd_')) refundIds.add(ref);
  return { paymentIds: [...paymentIds], orderIds: [...orderIds], refundIds: [...refundIds] };
}

import type { Types } from 'mongoose';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { PaymentGatewayRefundModel } from '@modules/finance/payment/payment.gatewayRefund.model';
import { razorpayIdsOf } from '@modules/finance/payment/payment.gatewayIds';
import { paymentSourceOf } from '@modules/finance/payment/payment.source';
import { PaymentEventModel } from '@modules/finance/failedPayment/paymentEvent.model';
import { FailedPaymentCaseModel } from '@modules/finance/failedPayment/failedPaymentCase.model';
import { RazorpayWebhookEventModel } from '@modules/finance/failedPayment/razorpayWebhookEvent.model';
import { toEventOut } from '@modules/finance/failedPayment/failedPayment.read';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { VenueFoodOrderModel } from '@modules/venues/venueFood/venueFoodOrder.model';
import { isRazorpayIdTerm } from '@modules/finance/payment/payment.razorpaySearch';
import { matchedOn, paymentRefFilter, razorpayIdSets, TRACE_PAYMENT_LIMIT } from './paymentTrace.match';

/**
 * Finance › Payment Trace: paste (or click) any id a payment goes by — our DPAY-
 * ref, an invoice number, a Razorpay payment / order / refund id — and see every
 * payment it belongs to and every log it shows up in: the payment's own
 * finalization steps and event timeline, Razorpay's webhook deliveries, the
 * failed-payment case, the Razorpay refunds, the shop orders it paid for, and a
 * venue's food orders (paid to the venue's own Razorpay account, so they are
 * not payments of ours and are found by their Razorpay ids alone).
 *
 * Every lookup is an exact match on an indexed field and every list is capped,
 * so a trace is a handful of indexed reads whatever is pasted. Read-only.
 */

const LIST_LIMIT = 200;
const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : null);
const orNull = (value: string | null | undefined) => value || null;
const rupees = (paise: number) => Math.round(paise) / 100;

type TracedPayment = IPayment & { _id: Types.ObjectId };

/** The payments a Razorpay refund id names through the refunds we sent; only a refund id can. */
async function refundedPaymentIds(ref: string): Promise<Types.ObjectId[]> {
  if (!ref.startsWith('rfnd_')) return [];
  const rows = await PaymentGatewayRefundModel.find({ razorpay_refund_id: ref }).select('payment_doc_id').limit(TRACE_PAYMENT_LIMIT).lean();
  return rows.map((r) => r.payment_doc_id);
}

/** The payments the id names: directly on the payment, or through a Razorpay refund we sent for it. */
async function findPayments(ref: string): Promise<TracedPayment[]> {
  const [direct, refunded] = await Promise.all([
    PaymentModel.find(paymentRefFilter(ref)).limit(TRACE_PAYMENT_LIMIT).lean<TracedPayment[]>(),
    refundedPaymentIds(ref),
  ]);
  const known = new Set(direct.map((p) => String(p._id)));
  const missing = refunded.filter((id) => !known.has(String(id)));
  if (missing.length === 0) return direct;
  const viaRefund = await PaymentModel.find({ _id: { $in: missing } }).lean<TracedPayment[]>();
  return [...direct, ...viaRefund];
}

function paymentOut(p: TracedPayment, ref: string) {
  const ids = razorpayIdsOf(p);
  return {
    id: String(p._id),
    payment_id: p.payment_id,
    invoice_no: orNull(p.invoice_no),
    source: paymentSourceOf(p),
    status: p.status,
    finalize_state: p.finalize_state ?? 'NOT_STARTED',
    amount: p.total,
    currency_symbol: p.currency_symbol,
    description: p.description ?? '',
    user_name: p.user_name,
    razorpay_payment_id: ids.razorpay_payment_id,
    razorpay_order_id: ids.razorpay_order_id,
    razorpay_refund_ids: ids.razorpay_refund_ids,
    matched_on: matchedOn(p, ref),
    created_at: new Date(p.created_at).toISOString(),
    paid_at: iso(p.paid_at),
  };
}

const stepsOf = (payments: readonly TracedPayment[]) =>
  payments.flatMap((p) =>
    (p.steps ?? []).map((s) => ({ payment_id: p.payment_id, key: s.key, status: s.status, detail: orNull(s.detail), at: iso(s.at) }))
  );

/** The Razorpay webhook deliveries that mention any of the ids. */
function webhooksFor(sets: ReturnType<typeof razorpayIdSets>) {
  const or = [
    ...(sets.paymentIds.length ? [{ 'summary.payment_id': { $in: sets.paymentIds } }] : []),
    ...(sets.orderIds.length ? [{ 'summary.order_id': { $in: sets.orderIds } }] : []),
    ...(sets.refundIds.length ? [{ 'summary.refund_id': { $in: sets.refundIds } }] : []),
  ];
  if (or.length === 0) return [];
  return RazorpayWebhookEventModel.find({ $or: or }).sort({ received_at: -1 }).limit(LIST_LIMIT).lean();
}

/** A venue's food orders the id names (only a Razorpay-shaped id can). */
function foodOrdersFor(ref: string) {
  if (!isRazorpayIdTerm(ref)) return [];
  return VenueFoodOrderModel.find({ $or: [{ razorpay_payment_id: ref }, { razorpay_order_id: ref }, { razorpay_refund_id: ref }] })
    .sort({ created_at: -1 })
    .limit(LIST_LIMIT)
    .lean();
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : null);

type RefFor = (id: Types.ObjectId | null | undefined) => string;
type Lean<T> = T extends (infer U)[] ? U : never;
type CaseRow = Lean<Awaited<ReturnType<typeof casesFor>>>;
type RefundRow = Lean<Awaited<ReturnType<typeof refundsFor>>>;
type ShopRow = Lean<Awaited<ReturnType<typeof shopOrdersFor>>>;
type WebhookRow = Lean<Awaited<ReturnType<typeof webhooksFor>>>;
type FoodRow = Lean<Awaited<ReturnType<typeof foodOrdersFor>>>;

// An empty `$in` is an indexed lookup that matches nothing, so a trace that
// found no payment costs nothing here and needs no special case.
const casesFor = (docIds: Types.ObjectId[]) =>
  FailedPaymentCaseModel.find({ payment_doc_id: { $in: docIds } })
    .select('payment_doc_id verification.status refund.status resolution.state created_at')
    .lean();
const refundsFor = (docIds: Types.ObjectId[]) =>
  PaymentGatewayRefundModel.find({ payment_doc_id: { $in: docIds } }).sort({ created_at: -1 }).limit(LIST_LIMIT).lean();
const shopOrdersFor = (docIds: Types.ObjectId[]) =>
  ProductOrderModel.find({ payment_id: { $in: docIds } })
    .select('payment_id order_no channel fulfilment_status total refund.status created_at')
    .limit(LIST_LIMIT)
    .lean();
const eventsFor = (docIds: Types.ObjectId[]) =>
  PaymentEventModel.find({ payment_doc_id: { $in: docIds } }).sort({ created_at: 1 }).limit(LIST_LIMIT).lean();

const caseOut = (refFor: RefFor) => (c: CaseRow) => ({
  id: String(c._id),
  payment_id: refFor(c.payment_doc_id),
  verification_status: c.verification?.status ?? 'PENDING',
  refund_status: c.refund?.status || 'NONE',
  resolution_state: c.resolution?.state ?? 'OPEN',
  created_at: new Date(c.created_at).toISOString(),
});

const refundOut = (refFor: RefFor) => (r: RefundRow) => ({
  id: String(r._id),
  payment_id: refFor(r.payment_doc_id),
  source: r.source,
  status: r.status,
  amount: rupees(r.amount_paise),
  razorpay_refund_id: orNull(r.razorpay_refund_id),
  razorpay_payment_id: orNull(r.razorpay_payment_id),
  reason: orNull(r.reason),
  last_error: orNull(r.last_error),
  created_at: new Date(r.created_at).toISOString(),
  processed_at: iso(r.processed_at),
});

const shopOrderOut = (refFor: RefFor) => (o: ShopRow) => ({
  id: String(o._id),
  payment_id: refFor(o.payment_id),
  order_no: o.order_no,
  channel: o.channel,
  fulfilment_status: o.fulfilment_status,
  total: o.total,
  refund_status: o.refund?.status || 'NONE',
  created_at: new Date(o.created_at).toISOString(),
});

const webhookAmount = (amount: unknown) => (typeof amount === 'number' && amount > 0 ? rupees(amount) : null);

const webhookOut = (w: WebhookRow) => ({
  id: String(w._id),
  event: w.event,
  razorpay_payment_id: text(w.summary?.payment_id),
  razorpay_order_id: text(w.summary?.order_id),
  razorpay_refund_id: text(w.summary?.refund_id),
  status: text(w.summary?.status),
  amount: webhookAmount(w.summary?.amount),
  outcome: orNull(w.outcome),
  error: orNull(w.error),
  received_at: new Date(w.received_at).toISOString(),
});

const foodOrderOut = (o: FoodRow) => ({
  id: String(o._id),
  order_no: o.order_no,
  venue_name: o.venue_name,
  status: o.status,
  payment_status: o.payment_status,
  amount: rupees(o.total_paise),
  currency_symbol: o.currency_symbol,
  razorpay_payment_id: orNull(o.razorpay_payment_id),
  razorpay_order_id: orNull(o.razorpay_order_id),
  razorpay_refund_id: orNull(o.razorpay_refund_id),
  created_at: new Date(o.created_at).toISOString(),
});

export async function paymentTrace(ref: string) {
  const payments = await findPayments(ref);
  const docIds = payments.map((p) => p._id);
  const refOf = new Map(payments.map((p) => [String(p._id), p.payment_id]));
  const refFor: RefFor = (id) => (id ? refOf.get(String(id)) ?? '' : '');

  const [events, cases, refunds, shopOrders, webhooks, foodOrders] = await Promise.all([
    eventsFor(docIds),
    casesFor(docIds),
    refundsFor(docIds),
    shopOrdersFor(docIds),
    webhooksFor(razorpayIdSets(payments, ref)),
    foodOrdersFor(ref),
  ]);

  return {
    ref,
    found: payments.length + webhooks.length + foodOrders.length > 0,
    payments: payments.map((p) => paymentOut(p, ref)),
    steps: stepsOf(payments),
    events: events.map((e) => ({ ...toEventOut(e), payment_id: refFor(e.payment_doc_id) })),
    failed_cases: cases.map(caseOut(refFor)),
    gateway_refunds: refunds.map(refundOut(refFor)),
    shop_orders: shopOrders.map(shopOrderOut(refFor)),
    webhooks: webhooks.map(webhookOut),
    food_orders: foodOrders.map(foodOrderOut),
  };
}

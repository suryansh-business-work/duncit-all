/**
 * Loads one payment's refunds from every engine that keeps them and hands the
 * records to the pure builders in payment.refundSections.ts. Read-only.
 *
 * Seven small indexed reads, run together, and only when the page asks for the
 * `refunds` field (it is a lazy field resolver, so a caller that does not select
 * it pays nothing).
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodShopReturnModel } from '@modules/commerce/podShopReturn/podShopReturn.model';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { FailedPaymentCaseModel } from '@modules/finance/failedPayment/failedPaymentCase.model';
import { refundEligibility } from '@modules/finance/failedPayment/failedPayment.refund';
import { toEventOut } from '@modules/finance/failedPayment/failedPayment.read';
import { listPaymentEvents } from '@modules/finance/failedPayment/paymentEvent.service';
import { PaymentModel } from './payment.model';
import { PaymentGatewayRefundModel } from './payment.gatewayRefund.model';
import {
  REFUND_KINDS,
  buildSection,
  caseEntry,
  caseHasRefund,
  coinEntry,
  gatewayEntry,
  gatewayKindOf,
  heldEntry,
  needsRecordedEntry,
  orderRefundEntry,
  recordedEntry,
  refundTargetOf,
  refundWriteRoles,
  type RefundEntry,
  type RefundEventOut,
  type RefundKind,
  type RefundSection,
} from './payment.refundSections';

/** Who is looking: decides, per kind, whether Refund buttons are live. */
export interface RefundViewer {
  can(kind: RefundKind): boolean;
}

/** Only refund activity belongs under the Refund heading. */
const isRefundEvent = (type: string) => type.startsWith('REFUND_');

type Bucket = Map<RefundKind, RefundEntry[]>;

function add(bucket: Bucket, kind: RefundKind, entry: RefundEntry | null) {
  if (!entry) return;
  bucket.set(kind, [...(bucket.get(kind) ?? []), entry]);
}

const KIND_SET: ReadonlySet<string> = new Set(REFUND_KINDS);
const asKind = (value: unknown): RefundKind | null =>
  typeof value === 'string' && KIND_SET.has(value) ? (value as RefundKind) : null;

interface RawEvent {
  case_id?: unknown;
  data?: Record<string, unknown> | null;
  type: string;
}

/**
 * Which section an event belongs to: a gateway refund's own step by its refund
 * record, a failed-payment step by its case, a Finance press by the kind it
 * carries. Anything else is payment-level and lands on the payment's own section.
 */
function kindOfEvent(event: RawEvent, gatewayKinds: Map<string, RefundKind>, caseIds: Set<string>): RefundKind | null {
  const gatewayId = event.data?.gateway_refund_id;
  if (typeof gatewayId === 'string' && gatewayKinds.has(gatewayId)) return gatewayKinds.get(gatewayId) ?? null;
  if (event.case_id && caseIds.has(String(event.case_id))) return 'FAILED_PAYMENT';
  return asKind(event.data?.kind);
}

export async function paymentRefundSections(
  paymentDocId: string,
  viewer: RefundViewer,
  now: Date = new Date()
): Promise<RefundSection[]> {
  if (!Types.ObjectId.isValid(paymentDocId)) return [];
  const payment = await PaymentModel.findById(paymentDocId);
  if (!payment) return [];

  const [gateway, orders, returns, cases, coins, events] = await Promise.all([
    PaymentGatewayRefundModel.find({ payment_doc_id: payment._id }).sort({ created_at: 1 }),
    ProductOrderModel.find({ payment_id: payment._id, 'refund.status': { $ne: '' } }).select('order_no channel refund'),
    PodShopReturnModel.find({ payment_id: payment._id, 'refund.status': { $ne: '' } }).select('return_no order_no refund'),
    FailedPaymentCaseModel.find({ payment_doc_id: payment._id }),
    CoinTransactionModel.find({ payment_id: payment.payment_id, source: 'PAYMENT_REFUND' }).sort({ created_at: 1 }),
    listPaymentEvents(payment._id),
  ]);

  const target = refundTargetOf(payment);
  const entries: Bucket = new Map();
  const gatewayKinds = new Map<string, RefundKind>();

  for (const record of gateway) {
    const kind = gatewayKindOf(record, payment);
    gatewayKinds.set(String(record._id), kind);
    add(entries, kind, gatewayEntry(record));
  }
  const held = heldEntry(payment);
  add(entries, payment.pod_id ? 'POD_PAYMENT' : 'PAYMENT', held);

  for (const order of orders) {
    // The e-commerce store's orders carry the PET_STORE channel; the pod shop's carry POD_SHOP.
    const ecomm = order.channel === 'PET_STORE';
    add(
      entries,
      ecomm ? 'ECOMM' : 'POD_SHOP',
      orderRefundEntry(
        { id: String(order._id), ref: order.order_no, source: 'CANCELLATION', refund: order.refund, razorpayPaymentId: target, retryable: !ecomm },
        now
      )
    );
  }
  for (const ret of returns) {
    add(
      entries,
      'POD_SHOP',
      orderRefundEntry(
        { id: String(ret._id), ref: ret.return_no, source: 'RETURN', refund: ret.refund, razorpayPaymentId: target, retryable: true },
        now
      )
    );
  }

  const caseIds = new Set<string>();
  for (const kase of cases) {
    if (!caseHasRefund(kase, payment.needs_refund)) continue;
    caseIds.add(String(kase._id));
    add(entries, 'FAILED_PAYMENT', caseEntry(kase, refundEligibility(kase) === null));
  }
  for (const txn of coins) add(entries, 'COIN', coinEntry(txn));

  // A refund older than every engine above leaves only the stamps on the payment.
  const explained = gateway.length + orders.length + returns.length > 0 || caseIds.size > 0 || held !== null;
  if (needsRecordedEntry(payment, explained)) {
    add(entries, payment.pod_id ? 'POD_PAYMENT' : 'PAYMENT', recordedEntry(payment));
  }

  // Payment-level activity with no record of its own belongs to the payment's own refund.
  const home = REFUND_KINDS.find((kind) => entries.has(kind) && kind !== 'COIN') ?? null;
  const byKind = new Map<RefundKind, RefundEventOut[]>();
  for (const event of events) {
    if (!isRefundEvent(event.type)) continue;
    const kind = kindOfEvent(event, gatewayKinds, caseIds) ?? home;
    if (kind) byKind.set(kind, [...(byKind.get(kind) ?? []), toEventOut(event)]);
  }

  return REFUND_KINDS.flatMap((kind) => {
    const section = buildSection(kind, entries.get(kind) ?? [], byKind.get(kind) ?? [], viewer.can(kind));
    return section ? [section] : [];
  });
}

/** The caller's Refund buttons, from their roles: the one place the role table is applied. */
export const refundViewerFor = (user: AuthUser): RefundViewer => ({
  can: (kind) => hasRole(user, refundWriteRoles(kind)),
});

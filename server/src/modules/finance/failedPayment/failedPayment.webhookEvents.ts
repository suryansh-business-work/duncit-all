import { logs } from '@observability/log';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { adoptRazorpayCapture } from '@modules/finance/payment/payment.capture';
import { applyRazorpayRefund, gatewayRefundForRazorpay } from '@modules/finance/payment/payment.gatewayRefund';
import { FailedPaymentCaseModel } from './failedPaymentCase.model';
import { isCaseEligible, upsertCaseForPayment } from './failedPaymentCase.service';
import { completeRefund, failRefund } from './failedPayment.refundOutcome';
import { recordPaymentEvent } from './paymentEvent.service';
import { receiptPrefix } from './failedPayment.refund';

/**
 * What each Razorpay webhook event does. Every handler is idempotent (a
 * redelivery or a race with the client/poller changes nothing twice).
 * `payment.captured` hands the payment to `adoptRazorpayCapture` — the same
 * path the reconciler takes, which asks Razorpay again rather than trusting the
 * body and runs the finalizer with all its guards — so a buyer whose app lost
 * the success callback is booked in seconds instead of on the next sweep.
 */

export type WebhookOutcome = 'APPLIED' | 'IGNORED';

type Entity = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

/** The entity a payload carries under `payload.<name>.entity`. */
export function entityOf(body: Entity, name: 'payment' | 'refund'): Entity {
  const payload = (body.payload ?? {}) as Record<string, { entity?: Entity } | undefined>;
  return payload[name]?.entity ?? {};
}

/** What is kept of a delivery: ids, status, amount and error — nothing about the buyer. Pure. */
export function summarize(body: Entity): Record<string, string | number | null> {
  const payment = entityOf(body, 'payment');
  const refund = entityOf(body, 'refund');
  return {
    event: text(body.event),
    payment_id: text(payment.id) || text(refund.payment_id),
    order_id: text(payment.order_id),
    status: text(payment.status) || text(refund.status),
    amount: Number(payment.amount ?? refund.amount ?? 0) || 0,
    error_code: text(payment.error_code),
    error_description: text(payment.error_description).slice(0, 300),
    error_reason: text(payment.error_reason),
    error_source: text(payment.error_source),
    error_step: text(payment.error_step),
    refund_id: text(refund.id),
    refund_receipt: text(refund.receipt),
  };
}

function paymentForOrder(orderId: string) {
  if (!orderId) return null;
  return PaymentModel.findOne({ gateway: 'RAZORPAY', 'metadata.razorpay_order_id': orderId });
}

async function onPaymentFailed(body: Entity, eventId: string): Promise<WebhookOutcome> {
  const entity = entityOf(body, 'payment');
  const payment = await paymentForOrder(text(entity.order_id));
  if (!payment) return 'IGNORED';
  const kase = isCaseEligible(payment)
    ? await upsertCaseForPayment(payment, {
        source: 'WEBHOOK',
        countAttempt: true,
        razorpayPaymentId: text(entity.id),
        error: {
          code: text(entity.error_code),
          description: text(entity.error_description),
          reason: text(entity.error_reason),
          source: text(entity.error_source),
          step: text(entity.error_step),
          reported_by: 'WEBHOOK',
        },
      })
    : null;
  await recordPaymentEvent({
    paymentDocId: payment._id,
    caseId: kase?._id,
    type: 'WEBHOOK_PAYMENT_FAILED',
    source: 'WEBHOOK',
    data: { razorpay_payment_id: text(entity.id), error_code: text(entity.error_code), error_reason: text(entity.error_reason) },
    dedupeKey: `webhook:${eventId}`,
  });
  return 'APPLIED';
}

async function onPaymentCaptured(body: Entity, eventId: string): Promise<WebhookOutcome> {
  const entity = entityOf(body, 'payment');
  const payment = await paymentForOrder(text(entity.order_id));
  if (!payment) return 'IGNORED';
  const kase = await FailedPaymentCaseModel.findOne({ payment_doc_id: payment._id }).select('_id').lean();
  await recordPaymentEvent({
    paymentDocId: payment._id,
    caseId: kase?._id,
    type: 'WEBHOOK_PAYMENT_CAPTURED',
    source: 'WEBHOOK',
    data: { razorpay_payment_id: text(entity.id), amount_paise: Number(entity.amount ?? 0) || 0 },
    dedupeKey: `webhook:${eventId}`,
  });
  // Not awaited: Razorpay times a delivery out after a few seconds and the
  // finalizer can take longer. A run that dies is the reconciler's to finish.
  adoptRazorpayCapture(payment, 'WEBHOOK').catch((error: unknown) =>
    logs.server.error('razorpay', 'webhook', { error, event_id: eventId, msg: 'capture adoption failed' })
  );
  return 'APPLIED';
}

/** The case a refund belongs to: by our receipt (`fpc_<case>_n`), else by its refund id. */
async function caseForRefund(refund: Entity) {
  const receipt = text(refund.receipt);
  const match = /^fpc_([a-f0-9]{24})_\d+$/i.exec(receipt);
  if (match && receipt.startsWith(receiptPrefix(match[1]))) return FailedPaymentCaseModel.findById(match[1]);
  const refundId = text(refund.id);
  return refundId ? FailedPaymentCaseModel.findOne({ 'refund.razorpay_refund_id': refundId }) : null;
}

async function onRefund(body: Entity, processed: boolean): Promise<WebhookOutcome> {
  const refund = entityOf(body, 'refund');
  const kase = await caseForRefund(refund);
  if (!kase) return onPodPaymentRefund(refund, processed);
  const refundId = text(refund.id);
  // A failure report for an older attempt must not fail the newer one.
  if (!processed && kase.refund.razorpay_refund_id && kase.refund.razorpay_refund_id !== refundId) return 'IGNORED';
  if (processed) await completeRefund(String(kase._id), refundId, 'WEBHOOK');
  else await failRefund(String(kase._id), 'Razorpay reported the refund as failed.', 'WEBHOOK');
  return 'APPLIED';
}

/**
 * A refund of a pod payment (cancellation, Finance refund, Backout) reported by
 * Razorpay — found by our `dr_` receipt or its refund id. A failure report for
 * an older attempt never fails the attempt that replaced it.
 */
async function onPodPaymentRefund(refund: Entity, processed: boolean): Promise<WebhookOutcome> {
  const refundId = text(refund.id);
  const record = await gatewayRefundForRazorpay({ id: refundId, receipt: text(refund.receipt) });
  if (!record) return 'IGNORED';
  if (!processed && record.razorpay_refund_id && record.razorpay_refund_id !== refundId) return 'IGNORED';
  await applyRazorpayRefund(
    record._id,
    {
      id: refundId,
      status: processed ? 'processed' : 'failed',
      amount: Number(refund.amount ?? 0) || 0,
      receipt: text(refund.receipt),
    },
    'WEBHOOK'
  );
  return 'APPLIED';
}

/** Route one verified delivery. Unknown events are stored by the caller and ignored here. */
export async function applyRazorpayEvent(body: Entity, eventId: string): Promise<WebhookOutcome> {
  switch (text(body.event)) {
    case 'payment.failed':
      return onPaymentFailed(body, eventId);
    case 'payment.captured':
      return onPaymentCaptured(body, eventId);
    case 'refund.processed':
      return onRefund(body, true);
    case 'refund.failed':
      return onRefund(body, false);
    default:
      return 'IGNORED';
  }
}

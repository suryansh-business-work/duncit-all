import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { completeRefund, failRefund } from './failedPayment.refundOutcome';
import { receiptPrefix } from './failedPayment.refund';

/**
 * The safety net for refunds whose end we never heard: no webhook configured,
 * a delivery lost, or a crash between claiming a refund and recording
 * Razorpay's answer. Every few minutes each refund PENDING for longer than the
 * in-flight window is looked up at Razorpay (by our receipt) and finished:
 * processed → completeRefund, failed → failRefund, still pending → left alone.
 * One Razorpay knows nothing of was never sent, so it is marked FAILED — a
 * retry is then safe, and still looks the refund up again before sending.
 */

const MINUTE_MS = 60_000;
const SWEEP_INTERVAL_MS = 10 * MINUTE_MS;
const FIRST_SWEEP_DELAY_MS = 3 * MINUTE_MS;
/** Younger than this, a refund may still be on the wire (see productOrder.refund IN_FLIGHT_MS). */
const STALE_AFTER_MS = 15 * MINUTE_MS;
const BATCH_LIMIT = 50;

async function settleOne(kase: IFailedPaymentCase): Promise<void> {
  const caseId = String(kase._id);
  const razorpayPaymentId = kase.refund.razorpay_payment_id;
  if (!razorpayPaymentId) {
    // Claimed, then nothing was ever sent (the process died before the send).
    await failRefund(caseId, 'No refund reached Razorpay; it is safe to retry.', 'SYSTEM');
    return;
  }
  const payment = await PaymentModel.findById(kase.payment_doc_id).select('metadata').lean();
  const account = (payment?.metadata?.razorpay_account as string | undefined) || null;
  const refunds = await listRazorpayRefunds(razorpayPaymentId, account);
  const prefix = receiptPrefix(caseId);
  const ours = refunds.filter((r) => r.id === kase.refund.razorpay_refund_id || r.receipt.startsWith(prefix));
  const processed = ours.find((r) => r.status === 'processed');
  if (processed) {
    await completeRefund(caseId, processed.id, 'SYSTEM');
    return;
  }
  if (ours.some((r) => r.status === 'pending')) return;
  await failRefund(
    caseId,
    ours.length > 0 ? 'Razorpay reported the refund as failed.' : 'No refund reached Razorpay; it is safe to retry.',
    'SYSTEM'
  );
}

export async function sweepPendingRefunds(now = Date.now()): Promise<void> {
  const stale = await FailedPaymentCaseModel.find({
    'refund.status': 'PENDING',
    'refund.claimed_at': { $lt: new Date(now - STALE_AFTER_MS) },
  })
    .sort({ 'refund.claimed_at': 1 })
    .limit(BATCH_LIMIT);
  for (const kase of stale) {
    // One unreachable payment must not hold back the rest of the batch.
    await settleOne(kase).catch((error: unknown) =>
      logs.server.error('failedPayment', 'sweepPendingRefunds', { error, case_id: String(kase._id) })
    );
  }
}

/** Start the pending-refund sweep (no-op under NODE_ENV=test). */
export function startFailedPaymentRefundPoller(): void {
  startClusterJob({
    component: 'failed-payment-refunds',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () => sweepPendingRefunds(),
  });
}

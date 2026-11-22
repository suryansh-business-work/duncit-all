import { logs } from '@observability/log';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { recordPaymentRefund } from '@modules/finance/payment/payment.refundRecord';
import { mailRefund } from '@modules/finance/payment/payment.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { alertStaff } from '@services/notify/staffAlert';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { recordPaymentEvent } from './paymentEvent.service';
import { resolveCaseTicket, ticketText } from './failedPayment.ticket';
import type { PaymentEventSource } from './failedPayment.types';

/**
 * How a refund ENDS — whichever of the three ways we learn it: Razorpay's
 * immediate answer, its `refund.processed` / `refund.failed` webhook, or the
 * pending-refund poller. All three land here, and each step below happens
 * exactly once however many of them arrive: the state flip is a conditional
 * write, and only the call that made it runs the ledger stamp, the ticket and
 * the buyer's notification.
 */

const REFUND_REASON = 'Failed payment refund (money deducted, booking not completed)';

/** Stamp Finance › User Refund Logs once; a failed stamp releases the flag so a later pass retries it. */
async function recordLedgerOnce(kase: IFailedPaymentCase): Promise<void> {
  const claimed = await FailedPaymentCaseModel.updateOne(
    { _id: kase._id, 'refund.finance_recorded': { $ne: true } },
    { $set: { 'refund.finance_recorded': true } }
  );
  if (claimed.modifiedCount === 0) return;
  try {
    const payment = await PaymentModel.findById(kase.payment_doc_id);
    if (!payment) throw new Error('payment not found');
    await recordPaymentRefund(payment, kase.refund.amount_paise / 100, REFUND_REASON, kase.refund.initiated_by || 'FINANCE');
  } catch (error) {
    await FailedPaymentCaseModel.updateOne({ _id: kase._id }, { $set: { 'refund.finance_recorded': false } });
    logs.server.error('failedPayment', 'recordLedgerOnce', { error, case_id: String(kase._id) });
  }
}

async function notifyBuyer(kase: IFailedPaymentCase): Promise<void> {
  const payment = await PaymentModel.findById(kase.payment_doc_id);
  // mailRefund never throws and sends the WhatsApp beside the email.
  if (payment) await mailRefund(payment, REFUND_REASON);
}

/** The refund reached the buyer. Idempotent. */
export async function completeRefund(
  caseId: string,
  razorpayRefundId: string,
  source: PaymentEventSource
): Promise<IFailedPaymentCase | null> {
  const now = new Date();
  const set: Record<string, unknown> = {
    'refund.status': 'PROCESSED',
    'refund.refunded_at': now,
    'refund.error': '',
    'resolution.state': 'REFUNDED',
    'resolution.at': now,
  };
  if (razorpayRefundId) set['refund.razorpay_refund_id'] = razorpayRefundId;
  const kase = await FailedPaymentCaseModel.findOneAndUpdate(
    { _id: caseId, 'refund.status': { $ne: 'PROCESSED' } },
    { $set: set, $inc: { revision: 1 } },
    { new: true }
  );
  if (!kase) return FailedPaymentCaseModel.findById(caseId);
  // The resolution belongs to whoever pressed Refund.
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id },
    { $set: { 'resolution.by': kase.refund.initiated_by, 'resolution.by_name': kase.refund.initiated_by_name } }
  );
  await recordLedgerOnce(kase);
  await recordPaymentEvent({
    paymentDocId: kase.payment_doc_id,
    caseId: kase._id,
    type: 'REFUND_PROCESSED',
    source,
    data: {
      razorpay_refund_id: kase.refund.razorpay_refund_id,
      razorpay_payment_id: kase.refund.razorpay_payment_id,
      amount_paise: kase.refund.amount_paise,
    },
    dedupeKey: `refund-processed:${caseId}`,
  });
  const settings = await getFinanceSettings();
  const text = ticketText.refunded(kase, kase.refund.razorpay_refund_id, String(settings.refund_processing_days));
  await resolveCaseTicket(kase, kase.refund.initiated_by, text, null);
  await notifyBuyer(kase);
  logs.server.info('failedPayment', 'refundProcessed', {
    case_id: caseId,
    razorpay_refund_id: kase.refund.razorpay_refund_id,
    amount_paise: kase.refund.amount_paise,
  });
  return FailedPaymentCaseModel.findById(caseId);
}

/** Razorpay refused (or lost) the refund: flag it FAILED for a retry and tell Finance. Idempotent. */
export async function failRefund(caseId: string, message: string, source: PaymentEventSource): Promise<IFailedPaymentCase | null> {
  const kase = await FailedPaymentCaseModel.findOneAndUpdate(
    { _id: caseId, 'refund.status': 'PENDING' },
    { $set: { 'refund.status': 'FAILED', 'refund.error': message.slice(0, 1000) }, $inc: { revision: 1 } },
    { new: true }
  );
  if (!kase) return FailedPaymentCaseModel.findById(caseId);
  logs.server.error('failedPayment', 'refundFailed', { case_id: caseId, error: message });
  await recordPaymentEvent({
    paymentDocId: kase.payment_doc_id,
    caseId: kase._id,
    type: 'REFUND_FAILED',
    source,
    data: { error: message, razorpay_payment_id: kase.refund.razorpay_payment_id, amount_paise: kase.refund.amount_paise },
  });
  // A refused refund leaves a buyer short of money until somebody retries it.
  await alertStaff({
    desk: 'FINANCE',
    title: `Failed-payment refund failed: ${kase.payment_id}`,
    lines: [
      `Amount: ${kase.currency_symbol}${(kase.refund.amount_paise / 100).toFixed(2)}`,
      `Gateway said: ${message}`,
      'Retry it from Finance › Failed Payments.',
    ],
  });
  return kase;
}

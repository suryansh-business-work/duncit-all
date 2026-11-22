import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { caseForPayment, isCaseEligible, upsertCaseForPayment } from './failedPaymentCase.service';
import { recordPaymentEvent } from './paymentEvent.service';
import type { ReportPaymentFailureInput } from './failedPayment.validator';

/**
 * The buyer's app telling us a Razorpay checkout failed — the only way the
 * server ever hears of a decline or a dismissed sheet, which Razorpay reports to
 * the browser alone. Idempotent per `client_request_id`: a retried report
 * answers with the same case and counts nothing twice.
 */

/**
 * A real checkout fails a handful of times; past this many reports one payment
 * is being replayed, and further reports are answered without being stored.
 */
const MAX_REPORTS_PER_CASE = 50;

/** A payment is only ever answered to its owner; anyone else gets NOT_FOUND, never a hint it exists. */
export async function ownPayment(paymentDocId: string, userId: string): Promise<IPayment> {
  const payment =
    Types.ObjectId.isValid(paymentDocId) && Types.ObjectId.isValid(userId)
      ? await PaymentModel.findOne({ _id: paymentDocId, user_id: new Types.ObjectId(userId) })
      : null;
  if (!payment) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
  if (!isCaseEligible(payment)) {
    throw new GraphQLError('This payment cannot be reported here.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return payment;
}

export async function reportPaymentFailure(input: ReportPaymentFailureInput, userId: string) {
  const payment = await ownPayment(input.payment_doc_id, userId);
  const dedupeKey = `client-report:${userId}:${input.client_request_id}`;
  const orderId = String(payment.metadata?.razorpay_order_id ?? '');
  // The client's ids are hints. An order id that is not this payment's is
  // dropped (and logged) rather than trusted.
  if (input.razorpay_order_id && orderId && input.razorpay_order_id !== orderId) {
    logs.server.warn('failedPayment', 'reportPaymentFailure', { payment_id: payment.payment_id, msg: 'reported order id does not match' });
  }

  const known = await caseForPayment(payment._id);
  if (known && known.attempts >= MAX_REPORTS_PER_CASE) {
    return { case_id: String(known._id), razorpay_payment_id: known.razorpay_payment_id || null };
  }
  const firstTime = await recordPaymentEvent({
    paymentDocId: payment._id,
    caseId: known?._id,
    type: 'CLIENT_FAILURE_REPORTED',
    source: 'CLIENT',
    data: {
      kind: input.kind,
      razorpay_payment_id: input.razorpay_payment_id,
      error_code: input.error_code,
      error_description: input.error_description,
      error_reason: input.error_reason,
      error_source: input.error_source,
      error_step: input.error_step,
      retry_shown: input.retry_shown,
      attempt_number: input.attempt_number,
    },
    dedupeKey,
  });
  if (!firstTime && known) return { case_id: String(known._id), razorpay_payment_id: known.razorpay_payment_id || null };

  const kase = await upsertCaseForPayment(payment, {
    source: 'CLIENT_REPORT',
    countAttempt: firstTime,
    retryShown: input.retry_shown,
    razorpayPaymentId: input.razorpay_payment_id,
    error: {
      code: input.error_code || input.kind,
      description: input.error_description,
      reason: input.error_reason,
      source: input.error_source,
      step: input.error_step,
      reported_by: 'CLIENT',
    },
  });
  if (!kase) throw new GraphQLError('This payment cannot be reported here.', { extensions: { code: 'BAD_USER_INPUT' } });
  if (firstTime && input.attempt_number > 1) {
    await recordPaymentEvent({
      paymentDocId: payment._id,
      caseId: kase._id,
      type: 'RETRY_ATTEMPT',
      source: 'CLIENT',
      data: { attempt_number: input.attempt_number },
      dedupeKey: `retry:${userId}:${input.client_request_id}`,
    });
  }
  return { case_id: String(kase._id), razorpay_payment_id: kase.razorpay_payment_id || null };
}

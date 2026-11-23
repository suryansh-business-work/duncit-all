/**
 * Adopting a Razorpay capture nobody verified yet — the one path the webhook
 * (`payment.captured`, seconds after the buyer pays) and the reconciler (the
 * sweep that catches what the webhook missed) both take.
 *
 * The webhook body is never the proof: Razorpay is asked again here, so a
 * replayed or forged delivery can only make us look, never book. The write that
 * moves `gateway_ref` from the order id to the payment id is conditional, so it
 * cannot land on a payment the client's own verify (or a second adopter) has
 * already settled, failed or handed to a refund. Two adopters that both pass it
 * are harmless: the finalizer is idempotent and only one core ever commits.
 */
import type { HydratedDocument } from 'mongoose';
import { logs } from '@observability/log';
import { PaymentModel, type IPayment } from './payment.model';
import { findCapturedPaymentForOrder } from './razorpay.gateway';
import { razorpayOrderIdOf } from './payment.gatewayIds';

export type CaptureSource = 'WEBHOOK' | 'RECONCILER';

/** States in which a payment has nothing left to adopt: booked, or captured and failed. */
const SETTLED_STATES = ['CORE_DONE', 'COMPLETE', 'FAILED'];

/** Whether a payment may still be adopted at all. Pure, for tests. */
export function isAdoptable(doc: Pick<IPayment, 'status' | 'gateway' | 'finalize_state' | 'metadata'>): boolean {
  return (
    doc.status === 'PENDING' &&
    doc.gateway === 'RAZORPAY' &&
    !SETTLED_STATES.includes(doc.finalize_state) &&
    // Finance (or the auto refund) is sending this capture back: never book it as well.
    !doc.metadata?.failed_payment_refund_case
  );
}

/** The finalizer pulls in the whole booking stack — loaded lazily to keep it out
 * of module-load order (it reaches back into this module's neighbours). */
async function loadFinalizer() {
  const { paymentFinalizer } = await import('./payment.finalize');
  return paymentFinalizer;
}

/**
 * Book the capture Razorpay holds for this payment's order, if there is one.
 * Answers whether a capture was found and adopted. Throws only what Razorpay or
 * the finalizer throw; callers decide whether that is worth a log or a retry.
 */
export async function adoptRazorpayCapture(doc: HydratedDocument<IPayment>, source: CaptureSource): Promise<boolean> {
  if (!isAdoptable(doc)) return false;
  const orderId = razorpayOrderIdOf(doc);
  if (!orderId) return false;
  const captured = await findCapturedPaymentForOrder(orderId, doc.metadata?.razorpay_account);
  if (!captured) return false;

  // Exactly the facts a successful verify writes, and only onto a payment that
  // is still waiting for them (or already carries this very capture).
  const claimed = await PaymentModel.updateOne(
    {
      _id: doc._id,
      status: 'PENDING',
      finalize_state: { $nin: SETTLED_STATES },
      gateway_ref: { $in: [orderId, captured.id] },
      'metadata.failed_payment_refund_case': { $exists: false },
    },
    {
      $set: {
        gateway_ref: captured.id,
        'metadata.razorpay_order_id': orderId,
        'metadata.razorpay_payment_id': captured.id,
        'metadata.reconciled_at': new Date().toISOString(),
        'metadata.adopted_by': source,
      },
    }
  );
  if (claimed.matchedCount === 0) return false;

  const paymentFinalizer = await loadFinalizer();
  await paymentFinalizer.finalizePayment(String(doc._id), 'Razorpay (reconciled)');
  // The receipt, ticket and shipment go out now rather than on the next sweep.
  paymentFinalizer
    .runSideEffects(String(doc._id))
    .catch((error: unknown) => logs.server.error('payment-capture', source, { error, payment_id: doc.payment_id }));
  // A failed-payment case the buyer opened for this checkout is answered: they have their booking.
  const { markCaseBooked } = await import('@modules/finance/failedPayment/failedPaymentCase.service');
  await markCaseBooked(String(doc._id));
  logs.server.info('payment-capture', source, {
    payment_id: doc.payment_id,
    razorpay_payment_id: captured.id,
    amount_paise: captured.amount,
    msg: 'Adopted a Razorpay capture the client had not verified',
  });
  return true;
}

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import {
  PaymentGatewayRefundModel,
  type IPaymentGatewayRefund,
} from '@modules/finance/payment/payment.gatewayRefund.model';
import { queueGatewayRefund, sendSoon } from '@modules/finance/payment/payment.gatewayRefund';
import { RentalBookingModel, rentalEventPush, type IRentalBooking } from './rentalBooking.model';
import { rentalRefundMoney } from './rentalRefundState';
import { notifyRentalRefundDelayed, notifyRentalRefundProcessed } from './rentalNotify';

/**
 * A rented item's refund, sent through Razorpay by Duncit — never marked paid
 * by a person.
 *
 * Every booking that closes owing money (a deposit back after the item came
 * back, a line that sold out at capture, a guest who left the pod) queues ONE
 * PaymentGatewayRefund keyed `rental_refund:<booking>`, through the same outbox
 * the pod refunds use: claimed once, adopted before a resend, followed to
 * Razorpay's own `processed`. The booking only reads PAID once Razorpay says
 * so (syncRentalRefund). Before queuing, the payment's other refunds are added
 * up so the item can never push what went back past what was captured.
 */

const SWEEP_BATCH = 50;
const REFUNDABLE_STATUSES = ['UNAVAILABLE', 'RELEASED', 'RETURNED', 'DAMAGED'];
/** The shortest note Finance must leave when it sends a refund that waited for review. */
export const RENTAL_REFUND_NOTE_MIN = 10;

export const rentalRefundKey = (bookingId: unknown) => `rental_refund:${String(bookingId)}`;

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

type RefundPayment = Pick<IPayment, '_id' | 'payment_id' | 'pod_id' | 'user_id' | 'gateway' | 'gateway_ref' | 'metadata' | 'total'>;

const paise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);

/**
 * What already went (or is going) back on this payment, in paise: every
 * gateway refund recorded against it except this booking's own, or the
 * payment's own refunded stamp if that is larger (refunds stamped before the
 * outbox existed have no record of their own).
 */
async function alreadyRefundedPaise(payment: RefundPayment, ownKey: string): Promise<number> {
  const records = await PaymentGatewayRefundModel.find({ payment_doc_id: payment._id, idempotency_key: { $ne: ownKey } })
    .select('amount_paise')
    .lean();
  const recorded = records.reduce((sum, r) => sum + (r.amount_paise ?? 0), 0);
  const stamped = paise(Number((payment.metadata as Record<string, unknown> | null)?.refunded_amount ?? 0));
  return Math.max(recorded, stamped);
}

async function holdForReview(bookingId: Types.ObjectId, reason: string, actor?: { id: string | null; role: 'SYSTEM' | 'FINANCE' }) {
  return RentalBookingModel.findOneAndUpdate(
    { _id: bookingId },
    {
      $set: { refund_review_reason: reason.slice(0, 500) },
      $push: rentalEventPush({ type: 'REFUND_REVIEW', actor_role: actor?.role ?? 'SYSTEM', actor_id: actor?.id, detail: reason }),
    },
    { new: true }
  ).lean<IRentalBooking>();
}

const reviewReasonOf = (record: IPaymentGatewayRefund) => {
  if (record.status === 'NOT_APPLICABLE') return 'This payment has no Razorpay money to refund (a test-gateway or offline payment).';
  if (record.status === 'RECONCILIATION_REQUIRED') {
    return record.last_error || 'Razorpay did not accept the refund after every retry. Check the Razorpay dashboard.';
  }
  return '';
};

/**
 * Queue one booking's refund on Razorpay. Idempotent: a booking already queued,
 * or not owed anything, comes back as it is. Answers the booking as it now stands.
 */
export async function queueRentalRefund(
  bookingId: Types.ObjectId | string,
  actor?: { id: string | null; role: 'SYSTEM' | 'FINANCE' }
): Promise<IRentalBooking | null> {
  const booking = await RentalBookingModel.findById(bookingId).lean<IRentalBooking>();
  if (!booking) return null;
  const owed =
    booking.refund_status === 'DUE' &&
    booking.refund_due > 0 &&
    !booking.gateway_refund_id &&
    !booking.refund_review_reason &&
    REFUNDABLE_STATUSES.includes(booking.status);
  if (!owed) return booking;
  const payment = await PaymentModel.findById(booking.payment_doc_id)
    .select('payment_id pod_id user_id gateway gateway_ref metadata total')
    .lean<RefundPayment>();
  if (!payment) return holdForReview(booking._id, 'The payment behind this rental could not be found.', actor);
  const key = rentalRefundKey(booking._id);
  const amountPaise = paise(booking.refund_due);
  const others = await alreadyRefundedPaise(payment, key);
  if (others + amountPaise > paise(payment.total)) {
    return holdForReview(
      booking._id,
      `Refunding ${booking.refund_due} would take this payment's refunds past the ${payment.total} captured (${others / 100} already refunded).`,
      actor
    );
  }
  const record = await queueGatewayRefund({
    payment,
    amount: booking.refund_due,
    key,
    source: 'RENTAL',
    reason: `Rented item ${booking.name} — ${booking.status.toLowerCase()}`,
    initiatedBy: actor?.role ?? 'SYSTEM',
    initiatorId: actor?.id ?? '',
  });
  if (!record) return booking;
  const reason = reviewReasonOf(record);
  const updated = await RentalBookingModel.findOneAndUpdate(
    { _id: booking._id, gateway_refund_id: null },
    {
      $set: { gateway_refund_id: record._id, refund_gateway_status: record.status, refund_review_reason: reason },
      $push: rentalEventPush({
        type: 'REFUND_QUEUED',
        actor_role: actor?.role ?? 'SYSTEM',
        actor_id: actor?.id,
        amount: booking.refund_due,
        detail: reason || `Refund queued on Razorpay (${record.razorpay_payment_id || 'no Razorpay payment id'})`,
      }),
    },
    { new: true }
  ).lean<IRentalBooking>();
  logs.server.info('rentalRefund', 'queue', {
    booking_id: String(booking._id),
    gateway_refund_id: String(record._id),
    status: record.status,
    amount: booking.refund_due,
  });
  sendSoon([record]);
  return updated ?? RentalBookingModel.findById(booking._id).lean<IRentalBooking>();
}

/** Queue every refund owed and not yet queued — the backstop behind each close's own queue call. */
export async function runRentalRefundSweep(): Promise<number> {
  const due = await RentalBookingModel.find({
    refund_status: 'DUE',
    refund_due: { $gt: 0 },
    gateway_refund_id: null,
    refund_review_reason: { $in: ['', null] },
    status: { $in: REFUNDABLE_STATUSES },
  })
    .select('_id')
    .limit(SWEEP_BATCH)
    .lean();
  let queued = 0;
  for (const { _id } of due) {
    try {
      const after = await queueRentalRefund(_id);
      if (after?.gateway_refund_id) queued += 1;
    } catch (error) {
      logs.server.error('rentalRefund', 'sweep', { error, booking_id: String(_id) });
    }
  }
  return queued;
}

const STATUS_EVENT: Record<string, string> = {
  PROCESSING: 'REFUND_PROCESSING',
  SUCCEEDED: 'REFUND_SUCCEEDED',
  FAILED: 'REFUND_FAILED',
  RECONCILIATION_REQUIRED: 'REFUND_REVIEW',
  NOT_APPLICABLE: 'REFUND_REVIEW',
};

/**
 * Razorpay moved this booking's refund: mirror it on the booking. Only a
 * CHANGE is written (and told to the guest), so a redelivered webhook or a
 * second poll changes nothing.
 */
export async function syncRentalRefund(record: IPaymentGatewayRefund): Promise<IRentalBooking | null> {
  const match = /^rental_refund:([a-f\d]{24})$/i.exec(record.idempotency_key);
  if (!match) return null;
  const set: Record<string, unknown> = { refund_gateway_status: record.status, gateway_refund_id: record._id };
  const amount = record.amount_paise / 100;
  if (record.status === 'SUCCEEDED') {
    Object.assign(set, {
      refund_status: 'PAID',
      refunded_amount: amount,
      refund_ref: record.razorpay_refund_id,
      refunded_at: record.processed_at ?? new Date(),
      refund_review_reason: '',
    });
  }
  const reason = reviewReasonOf(record);
  if (reason) set.refund_review_reason = reason;
  const event = STATUS_EVENT[record.status];
  const updated = await RentalBookingModel.findOneAndUpdate(
    { _id: match[1], refund_gateway_status: { $ne: record.status }, refund_status: { $ne: 'PAID' } },
    {
      $set: set,
      ...(event
        ? {
            $push: rentalEventPush({
              type: event,
              actor_role: 'RAZORPAY',
              amount,
              detail: [record.razorpay_refund_id, record.status === 'FAILED' ? record.last_error : reason]
                .filter(Boolean)
                .join(' · '),
            }),
          }
        : {}),
    },
    { new: true }
  ).lean<IRentalBooking>();
  if (!updated) return null;
  if (record.status === 'SUCCEEDED') await notifyRentalRefundProcessed(updated);
  if (record.status === 'RECONCILIATION_REQUIRED') await notifyRentalRefundDelayed(updated, reason);
  return updated;
}

type FinanceEvent = ReturnType<typeof rentalEventPush>;

/** A refund whose retries were used up goes back on the queue; the outbox adopts any refund that did reach Razorpay. */
async function requeueExhausted(booking: IRentalBooking, record: IPaymentGatewayRefund, event: FinanceEvent) {
  if (!record.razorpay_payment_id) fail('BAD_REQUEST', 'No Razorpay payment id is recorded on this payment, so the refund cannot be sent');
  const requeued = await PaymentGatewayRefundModel.findOneAndUpdate(
    { _id: record._id, status: 'RECONCILIATION_REQUIRED' },
    { $set: { status: 'QUEUED', attempts: 0, last_error: '', next_attempt_at: new Date() } },
    { new: true }
  );
  if (!requeued) return fail('CONFLICT', 'This refund changed while you were looking at it. Reload and try again');
  await RentalBookingModel.updateOne(
    { _id: booking._id },
    { $set: { refund_gateway_status: 'QUEUED', refund_review_reason: '' }, $push: event }
  );
  sendSoon([requeued]);
}

/** The timeline push for a reopened refund: a hand-typed reference is voided on the record, never deleted. */
function reopenEvents(booking: IRentalBooking, actorId: string, event: FinanceEvent): FinanceEvent {
  if (booking.refund_status !== 'PAID') return event;
  const voided = rentalEventPush({
    type: 'MANUAL_MARK_VOIDED',
    actor_role: 'FINANCE',
    actor_id: actorId,
    detail: `Earlier hand-typed reference "${booking.refund_ref}" was not a Razorpay refund`,
  });
  return { events: { $each: [...voided.events.$each, ...event.events.$each], $slice: event.events.$slice } };
}

/** A hand-marked or held refund goes back to owed, then out through Razorpay. */
async function reopenAndQueue(booking: IRentalBooking, actorId: string, event: FinanceEvent) {
  const handMarked = booking.refund_status === 'PAID';
  const reopened = await RentalBookingModel.updateOne(
    { _id: booking._id, refund_status: booking.refund_status, gateway_refund_id: null },
    {
      $set: { refund_status: 'DUE', refund_review_reason: '', ...(handMarked ? { refund_ref: '', refunded_at: null } : {}) },
      $push: reopenEvents(booking, actorId, event),
    }
  );
  if (reopened.modifiedCount === 0) fail('CONFLICT', 'This refund changed while you were looking at it. Reload and try again');
  const after = await queueRentalRefund(booking._id, { id: actorId, role: 'FINANCE' });
  if (after?.refund_review_reason) fail('BAD_REQUEST', after.refund_review_reason);
}

/**
 * Finance sends a refund that waited for review, through Razorpay. The one
 * thing Finance can do to a rental's money — and it moves real money through
 * the gateway, never a typed "paid":
 *  - a pre-gateway booking someone marked paid by hand: Finance confirms in the
 *    note that nothing reached the guest, and Razorpay sends it now;
 *  - a refund held because it would exceed the captured amount: re-checked;
 *  - a refund whose retries were used up: sent again.
 */
export async function sendRentalRefundByFinance(actorId: string, bookingId: string, note: string) {
  if (!Types.ObjectId.isValid(bookingId)) fail('BAD_USER_INPUT', 'That rental could not be found');
  const reason = (note ?? '').trim();
  if (reason.length < RENTAL_REFUND_NOTE_MIN) {
    fail('BAD_USER_INPUT', `Say why the refund is being sent (at least ${RENTAL_REFUND_NOTE_MIN} characters)`);
  }
  const booking = await RentalBookingModel.findById(bookingId).lean<IRentalBooking>();
  if (!booking) return fail('NOT_FOUND', 'That rental could not be found');
  if (rentalRefundMoney(booking).state !== 'REQUIRES_REVIEW') fail('CONFLICT', 'This rental has no refund waiting for review');
  const record = booking.gateway_refund_id ? await PaymentGatewayRefundModel.findById(booking.gateway_refund_id) : null;
  if (record?.status === 'NOT_APPLICABLE') {
    fail('BAD_REQUEST', 'This payment was not taken through Razorpay, so there is nothing to refund through the gateway');
  }
  const event = rentalEventPush({ type: 'FINANCE_SENT_REFUND', actor_role: 'FINANCE', actor_id: actorId, amount: booking.refund_due, detail: reason });
  if (record?.status === 'RECONCILIATION_REQUIRED') await requeueExhausted(booking, record, event);
  else await reopenAndQueue(booking, actorId, event);
  logs.server.info('rentalRefund', 'financeSend', { booking_id: bookingId, actor_user_id: actorId, amount: booking.refund_due });
  return RentalBookingModel.findById(booking._id).lean<IRentalBooking>();
}

/**
 * Where a rental's refund stands, from the facts on the booking and on its
 * Razorpay refund record. Pure, so the tables, the detail view, the apps and
 * the tests all read one answer.
 *
 * The amounts are kept apart on purpose. `refund_due` is what the booking was
 * owed when it closed and never changes; what reached the guest is what
 * Razorpay confirmed (`refunded_amount`), and a refund someone once marked
 * paid by typing a reference — before 2026-11-22 — is not money anyone can
 * vouch for, so it reads REQUIRES_REVIEW and stays outstanding.
 */

export const RENTAL_REFUND_STATES = [
  'NOT_ELIGIBLE', // nothing is owed back
  'AWAITING_RETURN', // the item is out; its deposit comes back once the venue marks it
  'ELIGIBLE', // owed, about to be queued on Razorpay by the refund sweep
  'PROCESSING', // queued, sending, or accepted by Razorpay and not yet processed
  'REFUNDED', // Razorpay confirmed the refund processed
  'FAILED', // Razorpay refused the last attempt; it is retried with back-off
  'REQUIRES_REVIEW', // waits for Finance: see refund_review_reason
  'IN_PAYMENT', // returned inside the pod cancellation's own refund
] as const;
export type RentalRefundState = (typeof RENTAL_REFUND_STATES)[number];

export interface RefundStateBooking {
  status: string;
  deposit_amount: number;
  refund_due: number;
  refund_status: string;
  refund_ref?: string | null;
  refunded_amount?: number | null;
  gateway_refund_id?: unknown;
  refund_gateway_status?: string | null;
  refund_review_reason?: string | null;
}

export interface RentalRefundMoney {
  state: RentalRefundState;
  /** What the booking is owed back. */
  eligible: number;
  /** Queued or in flight on Razorpay, not yet confirmed. */
  pending: number;
  /** Confirmed processed by Razorpay. */
  refunded: number;
  /** Owed and not yet confirmed. */
  outstanding: number;
  /** Why it waits for Finance; blank otherwise. */
  review_reason: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The reason a pre-gateway, hand-marked refund is not trusted. */
export const MANUAL_MARK_REASON =
  'Marked refunded by hand with a typed reference before Razorpay refunds; no Razorpay refund confirms it.';

const IN_FLIGHT = new Set(['QUEUED', 'SENDING', 'PROCESSING']);
const NEEDS_FINANCE = new Set(['RECONCILIATION_REQUIRED', 'NOT_APPLICABLE']);

export function rentalRefundState(b: RefundStateBooking): RentalRefundState {
  if (b.status === 'BOOKED') return b.deposit_amount > 0 ? 'AWAITING_RETURN' : 'NOT_ELIGIBLE';
  if (b.refund_status === 'IN_PAYMENT') return 'IN_PAYMENT';
  if (!(b.refund_due > 0)) return 'NOT_ELIGIBLE';
  const gateway = b.refund_gateway_status ?? '';
  if (b.refund_status === 'PAID') return b.gateway_refund_id && gateway === 'SUCCEEDED' ? 'REFUNDED' : 'REQUIRES_REVIEW';
  if (b.refund_review_reason) return 'REQUIRES_REVIEW';
  if (IN_FLIGHT.has(gateway)) return 'PROCESSING';
  if (gateway === 'FAILED') return 'FAILED';
  if (NEEDS_FINANCE.has(gateway)) return 'REQUIRES_REVIEW';
  if (gateway === 'SUCCEEDED') return 'REFUNDED';
  return 'ELIGIBLE';
}

export function rentalRefundMoney(b: RefundStateBooking): RentalRefundMoney {
  const state = rentalRefundState(b);
  const due = Math.max(0, round2(b.refund_due || 0));
  const eligible = state === 'NOT_ELIGIBLE' || state === 'AWAITING_RETURN' ? 0 : due;
  const refunded = state === 'REFUNDED' ? round2(b.refunded_amount || due) : 0;
  const pending = state === 'PROCESSING' || state === 'FAILED' ? due : 0;
  const outstanding = state === 'IN_PAYMENT' ? 0 : round2(Math.max(0, eligible - refunded));
  let reviewReason = '';
  if (state === 'REQUIRES_REVIEW') {
    reviewReason = b.refund_status === 'PAID' ? MANUAL_MARK_REASON : (b.refund_review_reason ?? '');
  }
  return { state, eligible, pending, refunded, outstanding, review_reason: reviewReason };
}

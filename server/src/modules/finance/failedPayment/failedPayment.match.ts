import type { RazorpayPaymentSummary } from '@modules/finance/payment/razorpay.gateway';
import type { VerificationStatus } from './failedPayment.types';

/**
 * The one rule that decides whether a claim is refundable without a person
 * looking at it. Pure — every fact is passed in — so it is tested exhaustively.
 *
 * MATCHED (green) needs ALL of:
 *  - an id the buyer entered or the AI read equals a payment Razorpay recorded
 *    against THIS case's order (its `pay_…` id, or a bank RRN / UPI / bank
 *    transaction reference of it) — never a payment from another order;
 *  - Razorpay says that payment is `captured`;
 *  - its amount equals what the checkout charged (and an amount read off the
 *    screenshot, when there is one, agrees to the rupee);
 *  - no booking was written for that payment.
 * A matching payment Razorpay never captured is NOT_CAPTURED (the bank reverses
 * it — nothing to refund). Anything else is UNMATCHED (yellow): a person reviews.
 */

export interface MatchInput {
  /** The transaction id entered, and the payment id / UTR the AI read. Blank entries are ignored. */
  claimedIds: readonly string[];
  /** Every payment Razorpay recorded against the case's order. */
  orderPayments: readonly RazorpayPaymentSummary[];
  /** What the checkout asked for, in paise. */
  expectedAmountPaise: number;
  /** The amount read off the evidence, in paise; null when none was read. */
  extractedAmountPaise: number | null;
  /** Whether a booking (seat / membership) exists for the case's payment row. */
  bookingExists: boolean;
  /** The Razorpay payment the booking was made with, when known. */
  bookedRazorpayPaymentId: string | null;
}

export interface MatchResult {
  status: Exclude<VerificationStatus, 'PENDING' | 'ERROR'>;
  matchedPaymentId: string;
  matchedFields: string[];
  razorpayStatus: string;
  razorpayAmount: number | null;
  notes: string;
}

/** A screenshot's rupee figure may be rounded for display — one rupee of slack, no more. */
const AMOUNT_TOLERANCE_PAISE = 100;

const normalise = (id: string) => id.trim().toLowerCase();

/** The order payment a claimed id names, and how it was named. */
function findClaimed(
  claimedIds: readonly string[],
  orderPayments: readonly RazorpayPaymentSummary[]
): { payment: RazorpayPaymentSummary; field: string } | null {
  const claimed = new Set(claimedIds.map(normalise).filter(Boolean));
  if (claimed.size === 0) return null;
  // A captured match wins over a failed attempt that shares a reference.
  const ranked = [...orderPayments].sort((a, b) => Number(b.status === 'captured') - Number(a.status === 'captured'));
  for (const payment of ranked) {
    if (claimed.has(normalise(payment.id))) return { payment, field: 'payment_id' };
    if (payment.references.some((ref) => claimed.has(normalise(ref)))) return { payment, field: 'bank_reference' };
  }
  return null;
}

const unmatched = (notes: string, extra: Partial<MatchResult> = {}): MatchResult => ({
  status: 'UNMATCHED',
  matchedPaymentId: '',
  matchedFields: [],
  razorpayStatus: '',
  razorpayAmount: null,
  notes,
  ...extra,
});

export function matchEvidence(input: MatchInput): MatchResult {
  const found = findClaimed(input.claimedIds, input.orderPayments);
  if (!found) {
    const anyCaptured = input.orderPayments.some((p) => p.status === 'captured');
    return unmatched(
      input.claimedIds.some((id) => id.trim())
        ? 'The id on the evidence is not a payment of this order.'
        : 'No transaction id could be read from the evidence.',
      { razorpayStatus: anyCaptured ? 'captured' : '' }
    );
  }
  const { payment, field } = found;
  const base = { matchedPaymentId: payment.id, razorpayStatus: payment.status, razorpayAmount: payment.amount };
  if (payment.status !== 'captured') {
    if (payment.status === 'refunded') return unmatched('Razorpay shows this payment as already refunded.', base);
    return { ...base, status: 'NOT_CAPTURED', matchedFields: [field], notes: 'Razorpay never captured this payment; the bank reverses it.' };
  }
  const fields = [field, 'status'];
  if (payment.amount !== input.expectedAmountPaise) {
    return unmatched('The captured amount differs from the checkout amount.', { ...base, matchedFields: fields });
  }
  fields.push('amount');
  if (
    input.extractedAmountPaise !== null &&
    Math.abs(input.extractedAmountPaise - payment.amount) > AMOUNT_TOLERANCE_PAISE
  ) {
    return unmatched('The amount on the evidence differs from what Razorpay captured.', { ...base, matchedFields: fields });
  }
  const bookedWithThis =
    input.bookingExists && (!input.bookedRazorpayPaymentId || input.bookedRazorpayPaymentId === payment.id);
  if (bookedWithThis) {
    return unmatched('A booking already exists for this payment.', { ...base, matchedFields: fields });
  }
  fields.push('no_booking');
  return { ...base, status: 'MATCHED', matchedFields: fields, notes: '' };
}

/** Rupees as read off a screenshot ("₹1,299.00", "1299") → paise; null when unreadable. Pure. */
export function rupeesToPaise(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replaceAll(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

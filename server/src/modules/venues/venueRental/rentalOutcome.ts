/**
 * What a rental owes once its outcome is known — to the guest, to the venue and
 * to Duncit. Pure, so every path that closes a booking (a venue's mark, the
 * deposit sweep, a Backout) settles the money the same way.
 *
 * The rules, from Finance > Rented Items > Settings:
 *  - Duncit's commission is on rent only, never on a deposit.
 *  - Duncit collected the deposit through Razorpay, so Duncit refunds it: once
 *    the item is back, the deposit less any damage claim goes back to the
 *    guest's original payment method through Razorpay (2026-11-22). The venue
 *    hands nothing back in cash and its payout carries only the damage claim.
 *  - When the settings say deposits are not refundable, nothing goes back and
 *    the whole deposit rides the venue's payout.
 *  - A damage claim comes out of the deposit, never more than the deposit.
 *  - A guest who leaves the pod gets the deposit back (the item never went
 *    out) and the rent back when the settings say so.
 *
 * Bookings closed before 2026-11-22 were settled under the older rule — the
 * venue handed the deposit back in cash and was paid the whole deposit — and
 * keep that frozen money (`deposit_policy: 'VENUE_CASH'`, see payoutSplit).
 */

export type RentalOutcome = 'RETURNED' | 'DAMAGED' | 'RELEASED';

/** How a booking's deposit was settled: refunded by Duncit (now), or in cash at the venue (bookings closed before 2026-11-22). */
export type DepositPolicy = 'DUNCIT_REFUND' | 'VENUE_CASH';

export interface OutcomeBooking {
  rent_amount: number;
  deposit_amount: number;
}

export interface OutcomeRules {
  commission_pct: number;
  deposit_refundable: boolean;
  rent_refundable_on_backout: boolean;
}

export interface OutcomeMoney {
  /** What Duncit owes the guest back through Razorpay. */
  refund_due: number;
  /** Cash the venue hands the guest at the venue. Always 0 now; kept for the bookings closed under the older rule. */
  deposit_at_venue: number;
  /** What Duncit pays the venue: rent less commission, plus any deposit it keeps (a damage claim, or a non-refundable deposit). */
  venue_amount: number;
  commission_amount: number;
  damage_claim: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function settleRentalOutcome(
  booking: OutcomeBooking,
  outcome: RentalOutcome,
  rules: OutcomeRules,
  claimed = 0
): OutcomeMoney {
  const rent = Math.max(0, booking.rent_amount);
  const deposit = Math.max(0, booking.deposit_amount);
  // The rent the venue keeps: all of it, unless a Backout gave it back.
  const keptRent = outcome === 'RELEASED' && rules.rent_refundable_on_backout ? 0 : rent;
  const commission = round2((keptRent * rules.commission_pct) / 100);
  const claim = outcome === 'DAMAGED' ? Math.min(deposit, Math.max(0, round2(claimed))) : 0;
  if (outcome === 'RELEASED') {
    // The item never went out: Duncit returns the deposit, and the rent when the rules say so.
    return {
      refund_due: round2(rent - keptRent + deposit),
      deposit_at_venue: 0,
      venue_amount: round2(keptRent - commission),
      commission_amount: commission,
      damage_claim: 0,
    };
  }
  const depositBack = rules.deposit_refundable ? round2(deposit - claim) : 0;
  return {
    refund_due: depositBack,
    deposit_at_venue: 0,
    venue_amount: round2(keptRent - commission + deposit - depositBack),
    commission_amount: commission,
    damage_claim: claim,
  };
}

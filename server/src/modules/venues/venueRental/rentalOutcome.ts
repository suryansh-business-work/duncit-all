/**
 * What a rental owes once its outcome is known — to the guest, to the venue and
 * to Duncit. Pure, so every path that closes a booking (a venue's mark, the
 * deposit sweep, a Backout) settles the money the same way.
 *
 * The rules, from Finance > Rented Items > Settings:
 *  - Duncit's commission is on rent only, never on a deposit.
 *  - An item that went out has its deposit settled AT THE VENUE: the venue
 *    checks the item when it comes back and hands the guest their deposit
 *    (less any damage) from its own till. Duncit never refunds that deposit
 *    through the gateway; it pays the whole deposit to the venue in its rental
 *    payout instead, so the venue is made whole for the cash it handed back.
 *  - When the settings say deposits are not refundable, the venue hands
 *    nothing back and still receives the deposit in its payout.
 *  - A damage claim comes out of the deposit, never more than the deposit.
 *  - A guest who leaves the pod gets the deposit back from Duncit (the item
 *    never went out) and the rent back when the settings say so.
 */

export type RentalOutcome = 'RETURNED' | 'DAMAGED' | 'RELEASED';

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
  /** What Duncit owes the guest back through Finance. */
  refund_due: number;
  /** What the venue hands the guest in cash at the venue when the item comes back. */
  deposit_at_venue: number;
  /** What Duncit pays the venue: rent less commission, plus every deposit the venue settled at the venue. */
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
  return {
    refund_due: 0,
    deposit_at_venue: rules.deposit_refundable ? round2(deposit - claim) : 0,
    venue_amount: round2(keptRent - commission + deposit),
    commission_amount: commission,
    damage_claim: claim,
  };
}

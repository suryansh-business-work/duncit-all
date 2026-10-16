/**
 * What a rental owes once its outcome is known — to the guest, to the venue and
 * to Duncit. Pure, so every path that closes a booking (a venue's mark, the
 * deposit sweep, a Backout) settles the money the same way.
 *
 * The rules, from Finance > Rented Items > Settings:
 *  - Duncit's commission is on rent only, never on a deposit.
 *  - A deposit comes back unless the settings say deposits are not
 *    refundable; then the venue keeps it, damage or not.
 *  - A damage claim comes out of the deposit, never more than the deposit.
 *  - A guest who leaves the pod gets the deposit back (the item never went
 *    out) and the rent back when the settings say so.
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
  refund_due: number;
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
  let depositBack: number;
  if (outcome === 'RELEASED') depositBack = deposit;
  else if (rules.deposit_refundable) depositBack = round2(deposit - claim);
  else depositBack = 0;
  return {
    refund_due: round2(rent - keptRent + depositBack),
    venue_amount: round2(keptRent - commission + deposit - depositBack),
    commission_amount: commission,
    damage_claim: claim,
  };
}

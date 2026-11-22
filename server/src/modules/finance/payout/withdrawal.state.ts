import type { ApprovalState, IPayoutState, PayoutState } from './payout.model';

/**
 * How a withdrawal reads, derived from what is stored.
 *
 * Rows written before approvals existed carry no `approval_status` and no
 * `payout`, only the legacy `status` (PENDING / PAID / REJECTED). They must keep
 * reading correctly — a PAID row from last year is APPROVED and PAID, not
 * PENDING — so nothing here assumes the new fields are present.
 */

export interface WithdrawalStateInput {
  status: 'PENDING' | 'PAID' | 'REJECTED';
  amount: number;
  requested_amount?: number | null;
  approval_status?: ApprovalState | null;
  approved_amount?: number | null;
  payout?: Pick<IPayoutState, 'status'> | null;
}

/** What Finance decided. A rejected row is REJECTED whatever else it carries. */
export function approvalOf(w: WithdrawalStateInput): ApprovalState {
  if (w.status === 'REJECTED') return 'REJECTED';
  if (w.approval_status) return w.approval_status;
  return w.status === 'PAID' ? 'APPROVED' : 'PENDING';
}

/** What the bank says, or null when no payout was ever started. */
export function payoutStatusOf(w: WithdrawalStateInput): PayoutState | null {
  if (w.payout?.status) return w.payout.status;
  // A legacy row Finance marked paid by hand: paid, though no payout record exists.
  return w.status === 'PAID' ? 'PAID' : null;
}

/** The single label the Finance tables show. Decision and payout stay separate fields. */
export type DisplayStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'PROCESSING' | 'PAID' | 'FAILED';

export function displayStatusOf(approval: ApprovalState, payout: PayoutState | null): DisplayStatus {
  if (approval === 'REJECTED') return 'REJECTED';
  if (payout) return payout;
  return approval;
}

/** What the user asked for: the stored request, else the amount (never lowered before a decision). */
export const requestedAmountOf = (w: WithdrawalStateInput): number => w.requested_amount ?? w.amount;

/** The additive fields every withdrawal read carries. */
export function withdrawalStatePub(
  w: WithdrawalStateInput & {
    decision_reason?: string;
    reviewed_by_name?: string;
    payout?: Partial<IPayoutState> | null;
  }
) {
  const approval = approvalOf(w);
  const payout = payoutStatusOf(w);
  return {
    requested_amount: requestedAmountOf(w),
    approval_status: approval,
    approved_amount: approval === 'APPROVED' || approval === 'PARTIALLY_APPROVED' ? (w.approved_amount ?? w.amount) : null,
    decision_reason: w.decision_reason ?? '',
    reviewed_by_name: w.reviewed_by_name ?? '',
    payout_status: payout,
    display_status: displayStatusOf(approval, payout),
    razorpay_payout_id: w.payout?.razorpay_payout_id ?? '',
    payout_utr: w.payout?.utr ?? '',
    payout_failure_reason: w.payout?.failure_reason ?? '',
    payout_attempt: w.payout?.attempt ?? 0,
    payout_initiated_at: w.payout?.initiated_at?.toISOString?.() ?? null,
    payout_completed_at: w.payout?.completed_at?.toISOString?.() ?? null,
  };
}

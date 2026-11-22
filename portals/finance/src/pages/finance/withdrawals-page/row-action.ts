import type { WithdrawalRow } from './queries';

/** Which row action applies, from where the decision and the payout stand. */
export type RowAction = 'ACCEPT' | 'RETRY' | 'REFRESH' | 'NONE';

export function rowActionOf(w: WithdrawalRow): RowAction {
  if (w.status !== 'PENDING') return 'NONE';
  if (w.approval_status === 'PENDING') return 'ACCEPT';
  if (w.payout_status === 'FAILED') return 'RETRY';
  if (w.payout_status === 'PROCESSING') return w.razorpay_payout_id ? 'REFRESH' : 'RETRY';
  return 'NONE';
}

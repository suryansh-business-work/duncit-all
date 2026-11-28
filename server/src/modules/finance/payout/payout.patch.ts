import type { Types } from 'mongoose';
import { idempotencyKeyFor } from './payout.dispatch';
import type { PayoutSubjectKind } from './payout.model';
import type { PayoutActor } from './payout.audit';

/**
 * The two pure pieces every settle shares — which record may settle, and what
 * settling writes — kept apart from {@link ./payout.settle} so a subject that
 * lives outside Finance (payroll lines) can settle with exactly the same rule
 * without an import cycle.
 */

export type SettleOutcome = 'PAID' | 'FAILED';
export type SettleResult = 'APPLIED' | 'IGNORED';

export interface SettleArgs {
  kind: PayoutSubjectKind;
  /** withdrawal_id, transfer_id or line_ref — our reference, also Razorpay's `reference_id`. */
  recordId: string;
  outcome: SettleOutcome;
  razorpayPayoutId: string;
  utr?: string;
  failureReason?: string;
  /** Razorpay's event id, or the caller's own key; one settle per key. */
  dedupeKey: string;
  actor?: PayoutActor;
}

/** Only a payout that is still PROCESSING, and is THIS payout (or has none recorded yet). */
export const settleFilter = (recordIdField: string, args: SettleArgs) => ({
  [recordIdField]: args.recordId,
  'payout.status': 'PROCESSING',
  'payout.razorpay_payout_id': { $in: [args.razorpayPayoutId, ''] },
});

export function payoutPatch(args: SettleArgs, now: Date) {
  return {
    'payout.status': args.outcome,
    'payout.razorpay_payout_id': args.razorpayPayoutId,
    'payout.completed_at': now,
    ...(args.outcome === 'PAID' ? { 'payout.utr': args.utr ?? '', 'payout.failure_reason': '' } : {}),
    ...(args.outcome === 'FAILED' ? { 'payout.failure_reason': (args.failureReason ?? '').slice(0, 500) } : {}),
  };
}

/**
 * What a deliberate retry of a FAILED payout writes: a new attempt under a new
 * idempotency key, back to PROCESSING. The caller filters on the old attempt
 * number, so two Retry presses claim one attempt between them.
 */
export function retryAttemptPatch(recordId: string, attempt: number, initiatedBy: Types.ObjectId | null) {
  return {
    'payout.status': 'PROCESSING',
    'payout.attempt': attempt,
    'payout.idempotency_key': idempotencyKeyFor(recordId, attempt),
    'payout.razorpay_payout_id': '',
    'payout.failure_reason': '',
    'payout.initiated_by': initiatedBy,
    'payout.initiated_at': new Date(),
    'payout.completed_at': null,
  };
}

import { logs } from '@observability/log';
import { executePayout, type PayoutPayee } from './payout.dispatch';
import { recordPayoutEvent, type PayoutActor } from './payout.audit';
import { settlePayout } from './payout.settle';
import type { IPayoutState, PayoutSubjectKind } from './payout.model';
import type { PayoutPurpose } from './razorpayX.gateway';

/**
 * Send ONE claimed payout and record the answer — shared by withdrawals and
 * Send Money so the two cannot diverge on the part that moves money.
 *
 * "Claimed" means the record is already PROCESSING under an idempotency key
 * (written in the same transaction as the decision, or by the create). This
 * never claims anything itself and never marks a payout paid on its own word:
 * a PAID answer is handed to {@link settlePayout}, the single place that can.
 */

interface PayoutRecord {
  payout?: IPayoutState | null;
}

/**
 * The two operations this needs from a model. Withdrawals and Send Money
 * transfers are different collections that share only their `payout` block, so
 * the runner is typed by what it uses rather than by either model.
 */
interface PayoutCollection {
  findOne(filter: Record<string, unknown>): { select(fields: string): { lean(): PromiseLike<unknown> } };
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): PromiseLike<unknown>;
}

export interface RunSpec {
  kind: PayoutSubjectKind;
  model: PayoutCollection;
  idField: 'withdrawal_id' | 'transfer_id';
  recordId: string;
  payee: PayoutPayee;
  amount: number;
  purpose: PayoutPurpose;
  narration: string;
  actor: PayoutActor;
  audit: { userId: string; userName: string; requestedAmount: number };
}

export async function runClaimedPayout(spec: RunSpec): Promise<void> {
  const filter = { [spec.idField]: spec.recordId, 'payout.status': 'PROCESSING' };
  const row = (await spec.model.findOne({ [spec.idField]: spec.recordId }).select('payout').lean()) as PayoutRecord | null;
  const payout = row?.payout;
  if (payout?.status !== 'PROCESSING' || payout.razorpay_payout_id) return;

  const result = await executePayout({
    payee: spec.payee,
    amount: spec.amount,
    purpose: spec.purpose,
    reference: spec.recordId,
    narration: spec.narration,
    idempotencyKey: payout.idempotency_key,
    known: { contact_id: payout.razorpay_contact_id, fund_account_id: payout.razorpay_fund_account_id },
  });
  const ids = {
    'payout.razorpay_contact_id': result.contact_id,
    'payout.razorpay_fund_account_id': result.fund_account_id,
  };
  if (result.outcome === 'UNKNOWN') {
    // Razorpay may or may not have it. Stay PROCESSING: a resend under the same key is idempotent.
    logs.server.warn('payout', 'payout unconfirmed', { record_id: spec.recordId, reason: result.failure_reason });
    await spec.model.updateOne(filter, { $set: ids });
    return;
  }
  const payoutId = result.payout?.id ?? '';
  if (result.outcome === 'PROCESSING') {
    await spec.model.updateOne(filter, { $set: { ...ids, 'payout.razorpay_payout_id': payoutId } });
    await recordPayoutEvent({
      kind: spec.kind,
      subjectId: spec.recordId,
      action: payout.attempt > 1 ? 'PAYOUT_RETRIED' : 'PAYOUT_SENT',
      userId: spec.audit.userId,
      userName: spec.audit.userName,
      requestedAmount: spec.audit.requestedAmount,
      approvedAmount: spec.amount,
      actor: spec.actor,
      paymentStatus: 'PROCESSING',
      razorpayPayoutId: payoutId,
      dedupeKey: `${spec.recordId}:sent:${payout.attempt}`,
    });
    return;
  }
  await spec.model.updateOne(filter, { $set: ids });
  await settlePayout({
    kind: spec.kind,
    recordId: spec.recordId,
    outcome: result.outcome,
    razorpayPayoutId: payoutId,
    utr: result.payout?.utr,
    failureReason: result.failure_reason,
    dedupeKey: `${spec.recordId}:attempt:${payout.attempt}`,
    actor: spec.actor,
  });
}

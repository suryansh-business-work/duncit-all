import { WalletWithdrawalModel, type IWalletWithdrawal } from '@modules/finance/wallet/wallet.model';
import { SendMoneyTransferModel, type ISendMoneyTransfer, type PayoutSubjectKind } from './payout.model';
import { SYSTEM_ACTOR, recordPayoutEvent, type PayoutActor } from './payout.audit';
import { notifyMoneyOut } from './payout.notify';

/**
 * The ONE place a payout becomes PAID or FAILED.
 *
 * Called by the Razorpay webhook, by the immediate answer to a payout request,
 * and by the manual "refresh" — they race each other, and this is what makes the
 * race harmless: the write is a single conditional update (only a PROCESSING
 * payout can settle), so exactly one caller wins and the others see `IGNORED`.
 * The winner alone writes the audit row and sends the notice.
 *
 * "Paid" is only ever what Razorpay reports as processed. Nothing else in this
 * system sets it.
 */

export type SettleOutcome = 'PAID' | 'FAILED';
export type SettleResult = 'APPLIED' | 'IGNORED';

export interface SettleArgs {
  kind: PayoutSubjectKind;
  /** withdrawal_id or transfer_id — our reference, also Razorpay's `reference_id`. */
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
const settleFilter = (recordIdField: string, args: SettleArgs) => ({
  [recordIdField]: args.recordId,
  'payout.status': 'PROCESSING',
  'payout.razorpay_payout_id': { $in: [args.razorpayPayoutId, ''] },
});

function payoutPatch(args: SettleArgs, now: Date) {
  return {
    'payout.status': args.outcome,
    'payout.razorpay_payout_id': args.razorpayPayoutId,
    'payout.completed_at': now,
    ...(args.outcome === 'PAID' ? { 'payout.utr': args.utr ?? '', 'payout.failure_reason': '' } : {}),
    ...(args.outcome === 'FAILED' ? { 'payout.failure_reason': (args.failureReason ?? '').slice(0, 500) } : {}),
  };
}

async function settleWithdrawal(args: SettleArgs): Promise<SettleResult> {
  const now = new Date();
  const row: IWalletWithdrawal | null = await WalletWithdrawalModel.findOneAndUpdate(
    settleFilter('withdrawal_id', args),
    {
      $set: {
        ...payoutPatch(args, now),
        // The legacy status the apps read flips to PAID only here, on the bank's word.
        ...(args.outcome === 'PAID' ? { status: 'PAID', paid_at: now } : {}),
      },
    },
    { new: true }
  );
  if (!row) return 'IGNORED';
  await recordPayoutEvent({
    kind: 'WITHDRAWAL',
    subjectId: row.withdrawal_id,
    action: args.outcome === 'PAID' ? 'PAYOUT_PAID' : 'PAYOUT_FAILED',
    userId: row.user_id,
    userName: row.beneficiary_name,
    requestedAmount: row.requested_amount ?? row.amount,
    approvedAmount: row.amount,
    reason: args.outcome === 'FAILED' ? (args.failureReason ?? '') : '',
    actor: args.actor ?? SYSTEM_ACTOR,
    paymentStatus: args.outcome,
    razorpayPayoutId: args.razorpayPayoutId,
    utr: args.utr ?? '',
    dedupeKey: `settle:${args.dedupeKey}`,
  });
  if (args.outcome === 'PAID') {
    await notifyMoneyOut({
      notice: 'WITHDRAWAL_PAID',
      recordId: row.withdrawal_id,
      userId: String(row.user_id),
      name: row.beneficiary_name,
      email: row.beneficiary_email,
      vars: { amount: row.amount, reference: args.utr || args.razorpayPayoutId },
    });
  }
  return 'APPLIED';
}

async function settleTransfer(args: SettleArgs): Promise<SettleResult> {
  const row: ISendMoneyTransfer | null = await SendMoneyTransferModel.findOneAndUpdate(
    settleFilter('transfer_id', args),
    { $set: payoutPatch(args, new Date()) },
    { new: true }
  );
  if (!row) return 'IGNORED';
  await recordPayoutEvent({
    kind: 'SEND_MONEY',
    subjectId: row.transfer_id,
    action: args.outcome === 'PAID' ? 'PAYOUT_PAID' : 'PAYOUT_FAILED',
    userId: row.recipient_user_id,
    userName: row.recipient_name,
    requestedAmount: row.amount,
    approvedAmount: row.amount,
    reason: args.outcome === 'FAILED' ? (args.failureReason ?? '') : row.reason,
    actor: args.actor ?? SYSTEM_ACTOR,
    paymentStatus: args.outcome,
    razorpayPayoutId: args.razorpayPayoutId,
    utr: args.utr ?? '',
    dedupeKey: `settle:${args.dedupeKey}`,
  });
  if (args.outcome === 'PAID') {
    await notifyMoneyOut({
      notice: 'SEND_MONEY_PAID',
      recordId: row.transfer_id,
      userId: String(row.recipient_user_id),
      name: row.recipient_name,
      email: row.recipient_email,
      vars: { amount: row.amount, reason: row.reason, reference: args.utr || args.razorpayPayoutId },
    });
  }
  return 'APPLIED';
}

export function settlePayout(args: SettleArgs): Promise<SettleResult> {
  return args.kind === 'WITHDRAWAL' ? settleWithdrawal(args) : settleTransfer(args);
}

/** Which record a Razorpay payout belongs to, from the `reference_id` we gave it. Pure. */
export function subjectOfReference(reference: string): { kind: PayoutSubjectKind; recordId: string } | null {
  if (reference.startsWith('wd_')) return { kind: 'WITHDRAWAL', recordId: reference };
  if (reference.startsWith('sm_')) return { kind: 'SEND_MONEY', recordId: reference };
  return null;
}

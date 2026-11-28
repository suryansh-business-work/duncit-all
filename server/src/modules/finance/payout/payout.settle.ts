import { WalletWithdrawalModel, type IWalletWithdrawal } from '@modules/finance/wallet/wallet.model';
import { SendMoneyTransferModel, type ISendMoneyTransfer, type PayoutSubjectKind } from './payout.model';
import { SYSTEM_ACTOR, recordPayoutEvent } from './payout.audit';
import { payoutPatch, settleFilter, type SettleArgs, type SettleResult } from './payout.patch';
import { notifyMoneyOut } from './payout.notify';
import { settlePayrollLine } from '@modules/hr/payroll/payroll.settle';

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

export type { SettleArgs, SettleOutcome, SettleResult } from './payout.patch';

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
  if (args.kind === 'WITHDRAWAL') return settleWithdrawal(args);
  if (args.kind === 'PAYROLL') return settlePayrollLine(args);
  return settleTransfer(args);
}

/** Which record a Razorpay payout belongs to, from the `reference_id` we gave it. Pure. */
export function subjectOfReference(reference: string): { kind: PayoutSubjectKind; recordId: string } | null {
  if (reference.startsWith('wd_')) return { kind: 'WITHDRAWAL', recordId: reference };
  if (reference.startsWith('sm_')) return { kind: 'SEND_MONEY', recordId: reference };
  if (reference.startsWith('pr_')) return { kind: 'PAYROLL', recordId: reference };
  return null;
}

import type { Types } from 'mongoose';
import { SYSTEM_ACTOR, recordPayoutEvent } from '@modules/finance/payout/payout.audit';
import { payoutPatch, settleFilter, type SettleArgs, type SettleResult } from '@modules/finance/payout/payout.patch';
import { HrPayrollLineModel, HrPayrollRunModel, type IPayrollLine } from './payroll.model';
import { SCHEDULER_ACTOR, recordRunEvent } from './payroll.history';
import { notifyPayoutFailed, notifySalaryPaid } from './payroll.notify';

/**
 * A salary line's payout becoming PAID or FAILED — the payroll branch of the
 * shared settle step, with the same single conditional write: only a line
 * still PROCESSING on this payout can settle, so the webhook, the immediate
 * answer and a refresh racing each other apply it once.
 */
export async function settlePayrollLine(args: SettleArgs): Promise<SettleResult> {
  const row = await HrPayrollLineModel.findOneAndUpdate(settleFilter('line_ref', args), { $set: payoutPatch(args, new Date()) }, { new: true }).lean<IPayrollLine>();
  if (!row) return 'IGNORED';
  const amount = row.net_paise / 100;
  await recordPayoutEvent({
    kind: 'PAYROLL',
    subjectId: row.line_ref,
    action: args.outcome === 'PAID' ? 'PAYOUT_PAID' : 'PAYOUT_FAILED',
    userId: row.user_id,
    userName: row.employee.name,
    requestedAmount: amount,
    approvedAmount: amount,
    reason: args.outcome === 'FAILED' ? (args.failureReason ?? '') : `Salary ${row.month}`,
    actor: args.actor ?? SYSTEM_ACTOR,
    paymentStatus: args.outcome,
    razorpayPayoutId: args.razorpayPayoutId,
    utr: args.utr ?? '',
    dedupeKey: `settle:${args.dedupeKey}`,
  });
  if (args.outcome === 'PAID') {
    await notifySalaryPaid(row, args.utr || args.razorpayPayoutId);
    await completeIfAllPaid(row.run_id);
  } else {
    await notifyPayoutFailed(row, args.failureReason ?? '');
  }
  return 'APPLIED';
}

/** A released run is COMPLETED once every line it pays through Razorpay is paid. Held lines wait outside that. */
export async function completeIfAllPaid(runId: Types.ObjectId): Promise<void> {
  const outstanding = await HrPayrollLineModel.exists({
    run_id: runId,
    bank: { $ne: null },
    $or: [{ payout: null }, { 'payout.status': { $ne: 'PAID' } }],
  });
  if (outstanding) return;
  const run = await HrPayrollRunModel.findOneAndUpdate({ _id: runId, status: 'RELEASED' }, { $set: { status: 'COMPLETED' }, $inc: { revision: 1 } });
  if (run) await recordRunEvent({ runId, action: 'COMPLETED', actor: SCHEDULER_ACTOR });
}

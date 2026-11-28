/**
 * Releasing a payroll and paying it — Finance's half, through the same
 * RazorpayX engine as withdrawals and Send Money.
 *
 *  - Release needs a Super Admin or Finance Manager who did NOT approve the run.
 *  - The bank account each salary goes to is copied (sealed) from the HR record
 *    at release, so a later change cannot redirect money Finance already
 *    released; the copy is what Finance saw.
 *  - Nothing is sent before the pay day. On it, each payable line is CLAIMED
 *    with a conditional update before Razorpay is called, so the scheduler and
 *    a person pressing a button at once still send one payout.
 *  - PAID is only ever what Razorpay reports, applied by the shared settle step.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { addDays } from '@modules/hr/leave/leave.rules';
import { appFormat } from '@utils/app-time';
import { todayKey } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { openField } from '@modules/portals/portalSecurity/portalSecurity.crypto';
import { assertPayoutsConfigured, idempotencyKeyFor } from '@modules/finance/payout/payout.dispatch';
import { retryAttemptPatch } from '@modules/finance/payout/payout.patch';
import { runClaimedPayout } from '@modules/finance/payout/payout.run';
import { refreshPayoutStatus } from '@modules/finance/payout/payout.refresh';
import { HrPayrollLineModel, HrPayrollRunModel, type IPayrollActor, type IPayrollBank, type IPayrollLine, type IPayrollRun } from './payroll.model';
import { loadRun } from './payroll.service';
import { payrollSettingsService } from './payroll.settings';
import { payoutActorOf, payrollActor, recordRunEvent, SCHEDULER_ACTOR } from './payroll.history';
import { notifyPayslipsReady } from './payroll.notify';
import { PAYROLL_LIMITS, blockingIssues, canReleaseRun, isPayable, releaseSchema } from './payroll.rules';

/** How many payouts go to Razorpay at once — enough to finish a run quickly, few enough to stay polite. */
const DISPATCH_CONCURRENCY = 3;

/** The salary account on an HR record, sealed as stored — or null when it cannot be paid. */
function bankSnapshot(employee: Pick<IHrEmployee, 'bank' | 'personal'> | undefined): IPayrollBank | null {
  if (!employee) return null;
  const bank = employee.bank;
  if (!bank?.account_number_sealed || !bank.ifsc || !bank.account_last4) return null;
  const holder = bank.account_holder_name?.trim() || `${employee.personal.first_name} ${employee.personal.last_name}`.trim();
  return { account_holder_name: holder, account_number_sealed: bank.account_number_sealed, account_last4: bank.account_last4, ifsc: bank.ifsc, bank_name: bank.bank_name ?? null };
}

async function banksFor(lines: readonly Pick<IPayrollLine, 'employee_id'>[]) {
  const employees = await HrEmployeeModel.find({ _id: { $in: lines.map((l) => l.employee_id) } })
    .select('bank personal')
    .lean<IHrEmployee[]>();
  return new Map(employees.map((e) => [String(e._id), bankSnapshot(e)]));
}

/** Claim a line's payout: only one with none yet, not held, in a released run whose pay day has come. */
async function claimLine(line: IPayrollLine, actor: IPayrollActor): Promise<boolean> {
  const result = await HrPayrollLineModel.updateOne(
    { _id: line._id, payout: null, hold: null, bank: { $ne: null } },
    {
      $set: {
        payout: {
          status: 'PROCESSING',
          attempt: 1,
          idempotency_key: idempotencyKeyFor(line.line_ref, 1),
          initiated_by: actor.user_id,
          initiated_at: new Date(),
        },
      },
    }
  );
  return result.modifiedCount === 1;
}

/** "Nov 2026" — Razorpay narrations take letters, digits and spaces only. */
const narrationMonth = (month: string) => appFormat(new Date(`${month}-15T12:00:00.000Z`), 'MMM yyyy');

/** Send one claimed line through the shared payout runner. */
export async function sendLinePayout(lineRef: string, actor: IPayrollActor, user?: Pick<AuthUser, 'roles'>): Promise<void> {
  const line = await HrPayrollLineModel.findOne({ line_ref: lineRef }).lean<IPayrollLine>();
  if (!line?.bank || line.payout?.status !== 'PROCESSING') return;
  const settings = await payrollSettingsService.get();
  await runClaimedPayout({
    kind: 'PAYROLL',
    model: HrPayrollLineModel,
    idField: 'line_ref',
    recordId: line.line_ref,
    payee: {
      name: line.employee.name,
      email: line.employee.email ?? '',
      method: settings.payout_mode,
      account_holder_name: line.bank.account_holder_name,
      account_number: openField(line.bank.account_number_sealed),
      ifsc_code: line.bank.ifsc,
      upi_id: '',
    },
    amount: line.net_paise / 100,
    purpose: 'salary',
    narration: `Duncit salary ${narrationMonth(line.month)}`,
    actor: payoutActorOf(actor, user),
    audit: { userId: String(line.user_id), userName: line.employee.name, requestedAmount: line.net_paise / 100 },
  });
}

/**
 * Pay every line of a released run whose pay day has come: new claims, and
 * claimed lines whose request may never have reached Razorpay (resent under
 * the same key, which Razorpay answers with the original payout).
 */
export async function dispatchRun(runId: Types.ObjectId, actor: IPayrollActor = SCHEDULER_ACTOR): Promise<number> {
  const run = await HrPayrollRunModel.findOne({ _id: runId, live: true, status: 'RELEASED' }).lean<IPayrollRun>();
  if (!run?.pay_on || run.pay_on > todayKey()) return 0;
  const lines = await HrPayrollLineModel.find({
    run_id: run._id,
    hold: null,
    bank: { $ne: null },
    $or: [{ payout: null }, { 'payout.status': 'PROCESSING', 'payout.razorpay_payout_id': '' }],
  }).lean<IPayrollLine[]>();
  let sent = 0;
  for (let i = 0; i < lines.length; i += DISPATCH_CONCURRENCY) {
    await Promise.all(
      lines.slice(i, i + DISPATCH_CONCURRENCY).map(async (line) => {
        if (!isPayable(line)) return;
        if (!line.payout && !(await claimLine(line, actor))) return;
        try {
          await sendLinePayout(line.line_ref, actor);
          sent += 1;
        } catch (error) {
          // One salary failing to send must not stop the rest; it stays PROCESSING or FAILED for a retry.
          logs.server.error('payroll.release', 'dispatch-line', { error, lineRef: line.line_ref });
        }
      })
    );
  }
  logs.server.info('payroll.release', 'dispatched', { runId: String(run._id), month: run.month, sent });
  return sent;
}

/** Start a run's payouts without holding the request open; failures are logged and retried by the scheduler. */
function startDispatch(runId: Types.ObjectId, actor: IPayrollActor) {
  dispatchRun(runId, actor).catch((error: unknown) => logs.server.error('payroll.release', 'dispatch', { error, runId: String(runId) }));
}

export const payrollReleaseService = {
  async release(id: string, raw: unknown, user: AuthUser): Promise<IPayrollRun> {
    const input = parseInput(releaseSchema, raw);
    const run = await loadRun(id);
    if (!canReleaseRun(run.status)) fail('BAD_REQUEST', 'Only an approved payroll can be released');
    if (run.approved?.by.user_id && String(run.approved.by.user_id) === user.id) {
      fail('FORBIDDEN', 'The person who approved this payroll cannot also release it. Ask another Finance Manager or Super Admin.');
    }
    const today = todayKey();
    if (input.pay_on < today) fail('BAD_USER_INPUT', 'The pay date cannot be in the past');
    if (input.pay_on > addDays(today, PAYROLL_LIMITS.releaseAheadDays)) fail('BAD_USER_INPUT', `The pay date can be at most ${PAYROLL_LIMITS.releaseAheadDays} days ahead`);
    await assertPayoutsConfigured();
    const lines = await HrPayrollLineModel.find({ run_id: run._id }).lean<IPayrollLine[]>();
    const banks = await banksFor(lines);
    const payable = lines.filter(isPayable);
    const missing = payable.filter((l) => !banks.get(String(l.employee_id)));
    if (missing.length > 0) {
      fail('BAD_REQUEST', `Bank details are missing for ${missing.map((l) => l.employee.name).join(', ')}. Send the payroll back to HR.`);
    }
    const actor = await payrollActor(user);
    await withTransaction(async (session) => {
      const updated = await HrPayrollRunModel.findOneAndUpdate(
        { _id: run._id, live: true, status: 'APPROVED', revision: run.revision },
        { $set: { status: 'RELEASED', pay_on: input.pay_on, released: { by: actor, at: new Date(), note: input.note } }, $inc: { revision: 1 } },
        { new: true, session }
      );
      if (!updated) fail('CONFLICT', 'This payroll was changed by someone else. Reload it and try again.');
      await HrPayrollLineModel.bulkWrite(
        lines.map((l) => ({
          updateOne: { filter: { _id: l._id }, update: { $set: { published: true, bank: isPayable(l) ? banks.get(String(l.employee_id)) : null } } },
        })),
        { session }
      );
      await recordRunEvent({ runId: run._id, action: 'RELEASED', actor, note: input.note, detail: { pay_on: input.pay_on, payable: payable.length }, session });
    });
    logs.server.info('payroll.release', 'released', { runId: id, month: run.month, payOn: input.pay_on, userId: user.id });
    const released = await loadRun(run._id);
    await notifyPayslipsReady(released);
    if (input.pay_on <= today) startDispatch(run._id, actor);
    return released;
  },

  /**
   * Get one line's payout moving again: a FAILED payout is a new attempt under
   * a new key (it never moved money); a PROCESSING one with no Razorpay id is
   * resent under the same key; one with an id is asked about.
   */
  async retry(lineId: string, user: AuthUser): Promise<IPayrollLine> {
    const line = await HrPayrollLineModel.findById(objectId(lineId, 'payroll line')).lean<IPayrollLine>();
    if (!line?.payout) return fail('BAD_USER_INPUT', 'This salary has no payout to retry');
    const actor = await payrollActor(user);
    const payout = line.payout;
    if (payout.status === 'PAID') fail('BAD_USER_INPUT', 'This salary is already paid');
    await assertPayoutsConfigured();
    if (payout.status === 'FAILED') {
      const attempt = payout.attempt + 1;
      const claimed = await HrPayrollLineModel.findOneAndUpdate(
        { _id: line._id, 'payout.status': 'FAILED', 'payout.attempt': payout.attempt },
        {
          $set: retryAttemptPatch(line.line_ref, attempt, actor.user_id),
        },
        { new: true }
      );
      if (claimed) {
        await recordRunEvent({ runId: line.run_id, lineId: line._id, action: 'PAYOUT_RETRIED', actor, detail: { attempt, employee_code: line.employee.code } });
        await sendLinePayout(line.line_ref, actor, user);
      }
    } else if (payout.razorpay_payout_id) {
      await refreshPayoutStatus('PAYROLL', line.line_ref, payoutActorOf(actor, user));
    } else {
      await sendLinePayout(line.line_ref, actor, user);
    }
    return (await HrPayrollLineModel.findById(line._id).lean<IPayrollLine>()) ?? line;
  },

  /**
   * Pay a salary HR held, once the reason is fixed. The bank account is read
   * fresh from the HR record (an approved bank change is often the fix), and
   * the line is paid at once if the run's pay day has come.
   */
  async payHeld(lineId: string, note: string | null, user: AuthUser): Promise<IPayrollLine> {
    const line = await HrPayrollLineModel.findById(objectId(lineId, 'payroll line')).lean<IPayrollLine>();
    if (!line?.hold) return fail('BAD_USER_INPUT', 'This salary is not held');
    const run = await loadRun(line.run_id);
    if (run.status !== 'RELEASED' && run.status !== 'COMPLETED') fail('BAD_REQUEST', 'Only a released payroll can pay a held salary');
    if (run.approved?.by.user_id && String(run.approved.by.user_id) === user.id) {
      fail('FORBIDDEN', 'The person who approved this payroll cannot also release a salary in it');
    }
    const bank = (await banksFor([line])).get(String(line.employee_id)) ?? null;
    const blocking = blockingIssues(line.issues).filter((issue) => issue !== 'NO_BANK');
    if (!bank) fail('BAD_REQUEST', 'This employee still has no bank account on record');
    if (blocking.length > 0 || line.net_paise <= 0) fail('BAD_REQUEST', 'This salary cannot be paid as it stands. HR must fix it in a later payroll.');
    await assertPayoutsConfigured();
    const actor = await payrollActor(user);
    const updated = await HrPayrollLineModel.findOneAndUpdate(
      { _id: line._id, hold: { $ne: null }, payout: null },
      { $set: { hold: null, bank, issues: line.issues.filter((issue) => issue !== 'NO_BANK') } },
      { new: true }
    ).lean<IPayrollLine>();
    if (!updated) return fail('CONFLICT', 'This salary was changed by someone else. Reload it.');
    await HrPayrollRunModel.updateOne({ _id: run._id, status: 'COMPLETED' }, { $set: { status: 'RELEASED' } });
    await recordRunEvent({ runId: run._id, lineId: line._id, action: 'LINE_RELEASED', actor, note, detail: { employee_code: line.employee.code } });
    if (run.pay_on && run.pay_on <= todayKey() && (await claimLine(updated, actor))) await sendLinePayout(updated.line_ref, actor, user);
    return (await HrPayrollLineModel.findById(line._id).lean<IPayrollLine>()) ?? updated;
  },
};

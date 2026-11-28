/**
 * A payroll run from draft to approval — HR's half. Releasing the money is
 * Finance's half ({@link ./payroll.release}).
 *
 * Every change names the run's revision, so two people editing one draft, or
 * an approval of numbers someone changed a moment ago, is refused rather than
 * silently merged. Approval is also refused when anything the numbers came
 * from (pay, leave, targets, employee records) changed after the last compute.
 */
import { Types, type ClientSession } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { EmployeeTargetModel } from '@modules/targets/employeeTarget/employeeTarget.model';
import { HrEmployeeModel } from '@modules/hr/employee/employee.model';
import { HrCompensationModel } from '@modules/hr/employee/compensation.model';
import { todayKey } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { HrLeaveRequestModel } from '@modules/hr/leave/leave.model';
import { firstDayOf, lastDayOf } from '@modules/hr/leave/leave.rules';
import {
  HrPayrollLineModel,
  HrPayrollRunModel,
  HrPayrollVariableClaimModel,
  type IPayrollActor,
  type IPayrollLine,
  type IPayrollRun,
  type PayrollEventAction,
} from './payroll.model';
import { computeLines, runTotals, type KeptParts } from './payroll.compute';
import { payrollSettingsService } from './payroll.settings';
import { payrollActor, recordRunEvent } from './payroll.history';
import { notifyRunApproved, notifyRunReturned } from './payroll.notify';
import {
  adjustmentSchema,
  approveSchema,
  blockingIssues,
  canEditRun,
  canReturnRun,
  createRunSchema,
  holdSchema,
  lineTotals,
  payDateFor,
  returnSchema,
  shiftMonth,
} from './payroll.rules';

export async function loadRun(id: string | Types.ObjectId): Promise<IPayrollRun> {
  const doc = await HrPayrollRunModel.findOne({ _id: typeof id === 'string' ? objectId(id, 'payroll run') : id, live: true }).lean<IPayrollRun>();
  return doc ?? fail('NOT_FOUND', 'Payroll run not found');
}

/** Apply `set` only while the run is still at `revision`; CONFLICT otherwise. */
async function writeRun(run: Pick<IPayrollRun, '_id'>, revision: number, set: Record<string, unknown>, session?: ClientSession) {
  const updated = await HrPayrollRunModel.findOneAndUpdate(
    { _id: run._id, live: true, revision },
    { $set: set, $inc: { revision: 1 } },
    { new: true, session }
  ).lean<IPayrollRun>();
  return updated ?? fail('CONFLICT', 'This payroll run was changed by someone else. Reload it and try again.');
}

/** True when pay, leave, targets or employee records changed after the run was last computed. */
export async function inputsChangedSince(run: Pick<IPayrollRun, 'month' | 'computed_at'>): Promise<boolean> {
  const since = run.computed_at;
  const from = firstDayOf(run.month);
  const to = lastDayOf(run.month);
  const checks = await Promise.all([
    HrEmployeeModel.exists({ updated_at: { $gt: since } }),
    HrCompensationModel.exists({ created_at: { $gt: since }, effective_from: { $lte: to } }),
    HrLeaveRequestModel.exists({ updated_at: { $gt: since }, start_date: { $lte: to }, end_date: { $gte: from } }),
    // A new review, not any write: the reminder sweep touches targets every day.
    EmployeeTargetModel.exists({ live: true, month: { $lte: run.month }, 'review.reviewed_at': { $gt: since } }),
  ]);
  return checks.some(Boolean);
}

/** Every target a run pays variable for must still be live and reviewed — a reopened one is re-reported first. */
async function assertTargetsStillReviewed(lines: readonly Pick<IPayrollLine, 'variable'>[]) {
  const ids = lines.flatMap((l) => l.variable.map((v) => v.target_id));
  if (ids.length === 0) return;
  const reviewed = await EmployeeTargetModel.countDocuments({ _id: { $in: ids }, live: true, status: 'REVIEWED' });
  if (reviewed !== new Set(ids.map(String)).size) {
    fail('BAD_REQUEST', 'A target paid in this run was reopened or deleted after it was computed. Recompute it, then approve.');
  }
}

const namesOf = (lines: Pick<IPayrollLine, 'employee'>[]) => {
  const names = lines.slice(0, 5).map((l) => l.employee.name);
  return lines.length > 5 ? `${names.join(', ')} and ${lines.length - 5} more` : names.join(', ');
};

async function recomputeTotals(run: IPayrollRun, session?: ClientSession) {
  const lines = await HrPayrollLineModel.find({ run_id: run._id })
    .select('hold gross_paise deductions_paise net_paise employer_paise')
    .session(session ?? null)
    .lean<IPayrollLine[]>();
  return runTotals(lines);
}

/** A line of a draft run that the caller may change — never their own salary. */
async function editableLine(lineId: string, user: AuthUser) {
  const line = await HrPayrollLineModel.findById(objectId(lineId, 'payroll line')).lean<IPayrollLine>();
  if (!line) return fail('NOT_FOUND', 'Payroll line not found');
  if (String(line.user_id) === user.id) fail('FORBIDDEN', 'You cannot change your own salary line. Ask another HR manager.');
  const run = await loadRun(line.run_id);
  if (!canEditRun(run.status)) fail('BAD_REQUEST', 'Only a draft payroll can be changed. Send it back to draft first.');
  return { line, run };
}

/** NEGATIVE_NET follows the net; every other issue stays as the compute found it. */
const withNetIssue = (issues: IPayrollLine['issues'], net: number): IPayrollLine['issues'] => [
  ...issues.filter((issue) => issue !== 'NEGATIVE_NET'),
  ...(net < 0 ? (['NEGATIVE_NET'] as const) : []),
];

async function changeLine(
  run: IPayrollRun,
  line: IPayrollLine,
  patch: Partial<Pick<IPayrollLine, 'adjustments' | 'hold'>>,
  event: { action: PayrollEventAction; actor: IPayrollActor; note?: string | null; detail?: Record<string, unknown> }
): Promise<IPayrollLine> {
  const next = { ...line, ...patch };
  const totals = lineTotals(next);
  await withTransaction(async (session) => {
    await HrPayrollLineModel.updateOne({ _id: line._id }, { $set: { ...patch, ...totals, issues: withNetIssue(line.issues, totals.net_paise) } }, { session });
    await writeRun(run, run.revision, { totals: await recomputeTotals(run, session) }, session);
    await recordRunEvent({ runId: run._id, lineId: line._id, ...event, detail: { employee_code: line.employee.code, ...event.detail }, session });
  });
  const saved = await HrPayrollLineModel.findById(line._id).lean<IPayrollLine>();
  return saved ?? fail('NOT_FOUND', 'Payroll line not found');
}

export const payrollRunService = {
  async create(rawMonth: string, actor: IPayrollActor, source: IPayrollRun['source']): Promise<IPayrollRun> {
    const { month } = parseInput(createRunSchema, { month: rawMonth });
    if (month > shiftMonth(todayKey().slice(0, 7), 1)) fail('BAD_USER_INPUT', 'Payroll can be prepared at most one month ahead');
    const settings = await payrollSettingsService.get();
    const runId = new Types.ObjectId();
    try {
      await HrPayrollRunModel.create({
        _id: runId,
        month,
        status: 'DRAFT',
        scheduled_pay_date: payDateFor(month, settings.pay_timing, settings.pay_day),
        source,
        computed_at: new Date(),
        computed_by: actor,
        created_by: actor,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) fail('CONFLICT', `There is already a payroll run for ${month}`);
      throw error;
    }
    try {
      const lines = await computeLines(month, runId, new Map());
      if (lines.length > 0) await HrPayrollLineModel.insertMany(lines);
      await HrPayrollRunModel.updateOne({ _id: runId }, { $set: { totals: runTotals(lines) } });
    } catch (error) {
      // A run that could not be filled is not left behind half-made.
      await HrPayrollLineModel.deleteMany({ run_id: runId });
      await HrPayrollRunModel.deleteOne({ _id: runId });
      throw error;
    }
    await recordRunEvent({ runId, action: 'CREATED', actor, detail: { month, source } });
    logs.server.info('payroll.service', 'created', { month, source, runId: String(runId) });
    return loadRun(runId);
  },

  async recompute(id: string, expectedRevision: number, user: AuthUser): Promise<IPayrollRun> {
    const run = await loadRun(id);
    if (!canEditRun(run.status)) fail('BAD_REQUEST', 'Only a draft payroll can be recomputed');
    const existing = await HrPayrollLineModel.find({ run_id: run._id }).select('employee_id adjustments hold line_ref').lean<IPayrollLine[]>();
    const kept = new Map<string, KeptParts>(existing.map((l) => [String(l.employee_id), { adjustments: l.adjustments, hold: l.hold, line_ref: l.line_ref }]));
    const lines = await computeLines(run.month, run._id, kept);
    const actor = await payrollActor(user);
    const stillIn = new Set(lines.map((l) => String(l.employee_id)));
    await withTransaction(async (session) => {
      await writeRun(run, expectedRevision, { totals: runTotals(lines), computed_at: new Date(), computed_by: actor }, session);
      await HrPayrollLineModel.deleteMany({ run_id: run._id }, { session });
      if (lines.length > 0) await HrPayrollLineModel.insertMany(lines, { session });
      await recordRunEvent({
        runId: run._id,
        action: 'RECOMPUTED',
        actor,
        detail: { employees: lines.length, dropped: existing.filter((l) => !stillIn.has(String(l.employee_id))).length },
        session,
      });
    });
    return loadRun(run._id);
  },

  async addAdjustment(lineId: string, raw: unknown, user: AuthUser): Promise<IPayrollLine> {
    const input = parseInput(adjustmentSchema, raw);
    const { line, run } = await editableLine(lineId, user);
    const actor = await payrollActor(user);
    const amount_paise = Math.round(input.amount * 100);
    const adjustment = { _id: new Types.ObjectId(), label: input.label, type: input.type, amount_paise, note: input.note, by: actor, at: new Date() };
    return changeLine(run, line, { adjustments: [...line.adjustments, adjustment] }, {
      action: 'ADJUSTED',
      actor,
      note: input.note,
      detail: { label: input.label, type: input.type, amount_paise },
    });
  },

  async removeAdjustment(lineId: string, adjustmentId: string, user: AuthUser): Promise<IPayrollLine> {
    const { line, run } = await editableLine(lineId, user);
    const target = line.adjustments.find((a) => String(a._id) === adjustmentId);
    if (!target) return fail('NOT_FOUND', 'Adjustment not found');
    return changeLine(run, line, { adjustments: line.adjustments.filter((a) => a !== target) }, {
      action: 'ADJUSTED',
      actor: await payrollActor(user),
      detail: { removed: target.label, type: target.type, amount_paise: -target.amount_paise },
    });
  },

  async hold(lineId: string, raw: unknown, user: AuthUser): Promise<IPayrollLine> {
    const { reason } = parseInput(holdSchema, raw);
    const { line, run } = await editableLine(lineId, user);
    const actor = await payrollActor(user);
    return changeLine(run, line, { hold: { by: actor, at: new Date(), note: reason } }, { action: 'HELD', actor, note: reason });
  },

  async unhold(lineId: string, user: AuthUser): Promise<IPayrollLine> {
    const { line, run } = await editableLine(lineId, user);
    return changeLine(run, line, { hold: null }, { action: 'UNHELD', actor: await payrollActor(user) });
  },

  async approve(id: string, expectedRevision: number, raw: unknown, user: AuthUser): Promise<IPayrollRun> {
    const { note } = parseInput(approveSchema, raw);
    const run = await loadRun(id);
    if (!canEditRun(run.status)) fail('BAD_REQUEST', 'Only a draft payroll can be approved');
    if (await inputsChangedSince(run)) {
      fail('BAD_REQUEST', 'Pay, leave, targets or employee records changed after this run was computed. Recompute it, check the numbers, then approve.');
    }
    const lines = await HrPayrollLineModel.find({ run_id: run._id }).lean<IPayrollLine[]>();
    if (lines.length === 0) fail('BAD_REQUEST', 'This payroll has nobody in it');
    const blocked = lines.filter((l) => !l.hold && blockingIssues(l.issues).length > 0);
    if (blocked.length > 0) fail('BAD_REQUEST', `Fix or hold these salaries first: ${namesOf(blocked)}`);
    await assertTargetsStillReviewed(lines);
    const actor = await payrollActor(user);
    const claims = lines.flatMap((l) => l.variable.map((v) => ({ target_id: v.target_id, run_id: run._id, line_id: l._id, employee_id: l.employee_id })));
    // Claims first: the unique index is what stops two runs paying one target. Undone by hand if anything after fails.
    try {
      if (claims.length > 0) await HrPayrollVariableClaimModel.insertMany(claims, { ordered: true });
      await writeRun(run, expectedRevision, { status: 'APPROVED', approved: { by: actor, at: new Date(), note } });
    } catch (error) {
      await HrPayrollVariableClaimModel.deleteMany({ run_id: run._id });
      if (isDuplicateKeyError(error)) fail('CONFLICT', 'Target-linked pay in this run was already approved in another run. Recompute this run.');
      throw error;
    }
    await recordRunEvent({ runId: run._id, action: 'APPROVED', actor, note, detail: { employees: lines.length, net_paise: run.totals.net_paise } });
    logs.server.info('payroll.service', 'approved', { runId: id, month: run.month, userId: user.id });
    const approved = await loadRun(run._id);
    await notifyRunApproved(approved);
    return approved;
  },

  /** Send an approved run back to draft — HR to change it, or Finance declining to release it. */
  async sendBack(id: string, raw: unknown, user: AuthUser): Promise<IPayrollRun> {
    const { note } = parseInput(returnSchema, raw);
    const run = await loadRun(id);
    if (!canReturnRun(run.status)) fail('BAD_REQUEST', 'Only an approved payroll that is not released yet can be sent back');
    const actor = await payrollActor(user);
    await writeRun(run, run.revision, { status: 'DRAFT', approved: null, returned: { by: actor, at: new Date(), note } });
    await HrPayrollVariableClaimModel.deleteMany({ run_id: run._id });
    await recordRunEvent({ runId: run._id, action: 'RETURNED', actor, note });
    const returned = await loadRun(run._id);
    await notifyRunReturned(returned, user.id);
    return returned;
  },

  async remove(id: string, user: AuthUser): Promise<boolean> {
    const run = await loadRun(id);
    if (!canEditRun(run.status)) fail('BAD_REQUEST', 'Only a draft payroll can be deleted');
    await writeRun(run, run.revision, { live: false });
    await HrPayrollLineModel.deleteMany({ run_id: run._id });
    await recordRunEvent({ runId: run._id, action: 'DELETED', actor: await payrollActor(user), detail: { month: run.month } });
    return true;
  },
};

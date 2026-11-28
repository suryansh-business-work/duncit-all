/**
 * Payroll against a real database, with only the RazorpayX HTTP calls faked:
 * what a month pays (unpaid leave, target-linked pay), the two-person
 * approve/release rule, the gates on approval, one payout per salary however
 * often dispatch runs, settling on Razorpay's word, retries, the payslip the
 * employee sees, and the scheduler's drafting window.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});
jest.mock('@modules/hr/hr.notify', () => ({
  ...jest.requireActual('@modules/hr/hr.notify'),
  notifyHr: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/finance/payout/razorpayX.gateway', () => ({
  ...jest.requireActual('@modules/finance/payout/razorpayX.gateway'),
  isPayoutConfigured: jest.fn().mockResolvedValue(true),
  createContact: jest.fn().mockResolvedValue('cont_test'),
  createFundAccount: jest.fn().mockResolvedValue('fa_test'),
  createPayout: jest.fn(),
}));

import { Types } from 'mongoose';
import { notifyHr } from '@modules/hr/hr.notify';
import { createPayout } from '@modules/finance/payout/razorpayX.gateway';
import { settlePayout } from '@modules/finance/payout/payout.settle';
import { PayoutEventModel } from '@modules/finance/payout/payout.model';
import { EmployeeTargetModel } from '@modules/targets/employeeTarget/employeeTarget.model';
import { HrLeaveRequestModel } from '@modules/hr/leave/leave.model';
import { todayKey } from '@modules/hr/employee/employee.events';
import { addDays } from '@modules/hr/leave/leave.rules';
import { M as EM, Q as EQ, PERSONAL, person, stubRoleTransactions, type Ctx } from '@modules/hr/employee/__tests__/hr.fixtures';
import { hrPayrollResolvers } from '../../payroll.resolver';
import { HrPayrollLineModel, HrPayrollRunModel, HrPayrollVariableClaimModel } from '../../payroll.model';
import { dispatchRun } from '../../payroll.release';
import { draftDueRuns } from '../../payroll.scheduler';
import { BANK, asRoles, employee } from '../../../__tests__/hr-ops.fixtures';

const Q = hrPayrollResolvers.Query as Record<string, (...a: any[]) => any>;
const M = hrPayrollResolvers.Mutation as Record<string, (...a: any[]) => any>;
const payout = jest.mocked(createPayout);

beforeAll(async () => {
  await Promise.all([HrPayrollRunModel.syncIndexes(), HrPayrollLineModel.syncIndexes(), HrPayrollVariableClaimModel.syncIndexes(), PayoutEventModel.syncIndexes()]);
}, 60_000);

stubRoleTransactions();
beforeEach(() => {
  jest.mocked(notifyHr).mockClear();
  payout.mockReset();
  payout.mockImplementation(async (args) => ({ id: `pout_${args.reference}`, status: 'processing', utr: '', failure_reason: '', reference_id: args.reference }));
});

const OCT = '2026-10';
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const linesOf = async (runId: string, ctx: Ctx) => (await Q.hrPayrollLinesTable({}, { run_id: runId, query: {} }, ctx)).rows;
const lineFor = async (runId: string, ctx: Ctx, employeeId: string) => (await linesOf(runId, ctx)).find((l: any) => l.employee_id === employeeId);

async function staff() {
  const hr = await person('Asha', ['HR_MANAGER']);
  const finance = await person('Farah', ['FINANCE_MANAGER']);
  const paid = await employee(hr, 'Meera', { bank: BANK });
  return { hr, finance, paid };
}

async function reviewedTarget(userId: string, month: string, percent: number) {
  const someone = { user_id: new Types.ObjectId(), name: 'Lead', email: null };
  return EmployeeTargetModel.create({
    employee: { user_id: new Types.ObjectId(userId), name: 'Meera Nair', email: null },
    month,
    goals: [{ title: 'Host 4 pods' }],
    status: 'REVIEWED',
    submission: { completion_percent: percent, achievements: [{ title: 'Hosted 3' }], submitted_at: new Date(), submitted_by: new Types.ObjectId(userId) },
    review: { comment: 'Fair', reviewed_by: someone, reviewed_at: new Date() },
    assigned_by: someone,
  });
}

describe('what a month pays', () => {
  it('pays each line for the days worked, less a day of approved unpaid leave', async () => {
    const { hr, paid } = await staff();
    await HrLeaveRequestModel.create({
      employee_id: paid.id,
      user_id: paid.userId,
      leave_type_id: new Types.ObjectId(),
      leave_type_paid: false,
      start_date: '2026-10-14',
      end_date: '2026-10-14',
      days: 1,
      day_breakdown: [{ date: '2026-10-14', days: 1 }],
      status: 'APPROVED',
      created_by: { user_id: new Types.ObjectId(paid.userId), name: 'Meera' },
    });
    const run = await M.createHrPayrollRun({}, { month: OCT }, hr);
    expect(run).toMatchObject({ status: 'DRAFT', source: 'MANUAL', totals: { employees: 1, net: 52451.61 } });
    const line = await lineFor(run.id, hr, paid.id);
    expect(line).toMatchObject({ days_in_month: 31, payable_days: 30, lop_days: 1, gross: 54193.55, deductions_total: 1741.94, net: 52451.61, issues: [] });
    expect(line.earnings.map((e: any) => [e.label, e.monthly_amount, e.amount])).toEqual([
      ['Basic', 40000, 38709.68],
      ['HRA', 16000, 15483.87],
    ]);
    expect(line.employer).toEqual([{ label: 'Employer PF', monthly_amount: 1800, amount: 1741.94 }]);
    await expect(M.createHrPayrollRun({}, { month: OCT }, hr)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });

  it('pays a reviewed target once: in the first run that approves it, and again only if that run goes back to draft', async () => {
    const { hr, paid } = await staff();
    await reviewedTarget(paid.userId, OCT, 80);
    const october = await M.createHrPayrollRun({}, { month: OCT }, hr);
    const octLine = await lineFor(october.id, hr, paid.id);
    expect(octLine.variable).toEqual([expect.objectContaining({ target_month: OCT, label: 'Target incentive', base_amount: 10000, completion_percent: 80, amount: 8000 })]);
    expect(octLine.net).toBe(62200);
    await M.approveHrPayrollRun({}, { id: october.id, expected_revision: october.revision }, hr);
    expect(await HrPayrollVariableClaimModel.countDocuments({ run_id: october.id })).toBe(1);

    const november = await M.createHrPayrollRun({}, { month: '2026-11' }, hr);
    expect((await lineFor(november.id, hr, paid.id)).variable).toEqual([]);

    await M.returnHrPayrollRun({}, { id: october.id, note: 'Recheck the incentive' }, hr);
    expect(await HrPayrollVariableClaimModel.countDocuments({})).toBe(0);
    const recomputed = await M.recomputeHrPayrollRun({}, { id: november.id, expected_revision: (await Q.hrPayrollRun({}, { id: november.id }, hr)).revision }, hr);
    expect((await lineFor(recomputed.id, hr, paid.id)).variable).toEqual([expect.objectContaining({ target_month: OCT, amount: 8000 })]);
  });
});

describe('approving', () => {
  it('refuses while a salary is blocked, until HR holds it', async () => {
    const { hr, paid } = await staff();
    const unbanked = await employee(hr, 'Ravi');
    const run = await M.createHrPayrollRun({}, { month: OCT }, hr);
    expect((await lineFor(run.id, hr, unbanked.id)).issues).toEqual(['NO_BANK']);
    await expect(M.approveHrPayrollRun({}, { id: run.id, expected_revision: run.revision }, hr)).rejects.toThrow('Fix or hold these salaries first: Ravi Nair');
    const held = await M.holdHrPayrollLine({}, { line_id: (await lineFor(run.id, hr, unbanked.id)).id, reason: 'Bank details awaited' }, hr);
    expect(held.hold).toMatchObject({ note: 'Bank details awaited' });
    const current = await Q.hrPayrollRun({}, { id: run.id }, hr);
    expect(current.totals).toMatchObject({ employees: 2, held: 1 });
    await expect(M.approveHrPayrollRun({}, { id: run.id, expected_revision: current.revision }, hr)).resolves.toMatchObject({ status: 'APPROVED' });
    expect(jest.mocked(notifyHr).mock.calls.at(-1)?.[0]).toMatchObject({ email: { template: 'hr-payroll-awaiting-release' } });
    expect((await lineFor(run.id, hr, paid.id)).hold).toBeNull();
  });

  it('refuses numbers whose inputs changed after the compute, and approves once recomputed', async () => {
    const { hr, paid } = await staff();
    const run = await M.createHrPayrollRun({}, { month: OCT }, hr);
    await tick();
    const { employee: record } = await EQ.hrEmployee({}, { id: paid.id }, hr);
    await EM.updateHrEmployeePersonal({}, { id: paid.id, input: { ...PERSONAL, first_name: 'Meera', last_name: 'Menon' }, expected_revision: record.revision }, hr);
    expect((await Q.hrPayrollRun({}, { id: run.id }, hr)).needs_recompute).toBe(true);
    await expect(M.approveHrPayrollRun({}, { id: run.id, expected_revision: run.revision }, hr)).rejects.toThrow('changed after this run was computed');
    const fresh = await M.recomputeHrPayrollRun({}, { id: run.id, expected_revision: run.revision }, hr);
    await expect(M.approveHrPayrollRun({}, { id: run.id, expected_revision: fresh.revision }, hr)).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('adds an adjustment to the net, and never lets HR touch their own salary', async () => {
    const { hr, paid } = await staff();
    const hrSelf = await employee(hr, 'Self', { bank: BANK });
    const run = await M.createHrPayrollRun({}, { month: OCT }, hr);
    const line = await lineFor(run.id, hr, paid.id);
    const bonus = await M.addHrPayrollAdjustment({}, { line_id: line.id, input: { label: 'Festival bonus', type: 'EARNING', amount: 2500.5, note: 'Diwali' } }, hr);
    expect(bonus.net).toBe(line.net + 2500.5);
    const back = await M.removeHrPayrollAdjustment({}, { line_id: line.id, adjustment_id: bonus.adjustments[0].id }, hr);
    expect(back.net).toBe(line.net);
    const own = await lineFor(run.id, hr, hrSelf.id);
    const selfHr = asRoles(hrSelf.ctx, ['HR_MANAGER']);
    await expect(M.addHrPayrollAdjustment({}, { line_id: own.id, input: { label: 'Raise', type: 'EARNING', amount: 1 } }, selfHr)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });
});

describe('releasing and paying', () => {
  async function approvedRun() {
    const { hr, finance, paid } = await staff();
    const run = await M.createHrPayrollRun({}, { month: OCT }, hr);
    await M.approveHrPayrollRun({}, { id: run.id, expected_revision: run.revision }, hr);
    return { hr, finance, paid, runId: run.id as string };
  }

  it('is refused to the person who approved, and to HR without a Finance seat', async () => {
    const boss = await person('Dev', ['SUPER_ADMIN']);
    await employee(boss, 'Meera', { bank: BANK });
    const run = await M.createHrPayrollRun({}, { month: OCT }, boss);
    await M.approveHrPayrollRun({}, { id: run.id, expected_revision: run.revision }, boss);
    await expect(M.releaseHrPayrollRun({}, { id: run.id, pay_on: todayKey() }, boss)).rejects.toThrow('cannot also release');
    const hr = await person('Asha', ['HR_MANAGER']);
    await expect(M.releaseHrPayrollRun({}, { id: run.id, pay_on: todayKey() }, hr)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect((await Q.hrPayrollRun({}, { id: run.id }, boss)).status).toBe('APPROVED');
  });

  it('copies the bank account at release, sends one payout on the pay day however often dispatch runs, and completes on Razorpay\'s word', async () => {
    const { hr, finance, paid, runId } = await approvedRun();
    const released = await M.releaseHrPayrollRun({}, { id: runId, pay_on: addDays(todayKey(), 1), note: 'October salaries' }, finance);
    expect(released).toMatchObject({ status: 'RELEASED', pay_on: addDays(todayKey(), 1), released: { note: 'October salaries' } });
    const line = await lineFor(runId, hr, paid.id);
    expect(line).toMatchObject({ published: true, bank_last4: '9012', bank_ifsc: 'HDFC0001234', payout: null });
    expect((await Q.myPayslips({}, {}, paid.ctx))[0]).toMatchObject({ month: OCT, status: 'SCHEDULED', net: line.net });

    expect(await dispatchRun(new Types.ObjectId(runId))).toBe(0);
    await HrPayrollRunModel.updateOne({ _id: runId }, { $set: { pay_on: todayKey() } });
    expect(await dispatchRun(new Types.ObjectId(runId))).toBe(1);
    await dispatchRun(new Types.ObjectId(runId));
    const stored = await HrPayrollLineModel.findById(line.id).lean();
    expect(payout).toHaveBeenCalledTimes(1);
    expect(payout.mock.calls[0]?.[0]).toMatchObject({
      amountPaise: Math.round(line.net * 100),
      purpose: 'salary',
      mode: 'IMPS',
      reference: stored?.line_ref,
      idempotencyKey: `${stored?.line_ref}:1`,
      narration: 'Duncit salary Oct 2026',
    });

    const settle = (dedupeKey: string) =>
      settlePayout({ kind: 'PAYROLL', recordId: stored?.line_ref ?? '', outcome: 'PAID', razorpayPayoutId: `pout_${stored?.line_ref}`, utr: 'UTR123', dedupeKey });
    await expect(settle('evt_1')).resolves.toBe('APPLIED');
    await expect(settle('evt_2')).resolves.toBe('IGNORED');
    expect((await Q.hrPayrollRun({}, { id: runId }, hr)).status).toBe('COMPLETED');
    expect((await Q.myPayslips({}, {}, paid.ctx))[0]).toMatchObject({ status: 'PAID', reference: 'UTR123' });
    const trail = await PayoutEventModel.find({ subject_kind: 'PAYROLL', subject_id: stored?.line_ref }).sort({ created_at: 1, _id: 1 }).lean();
    expect(trail.map((e) => e.action)).toEqual(['PAYOUT_SENT', 'PAYOUT_PAID']);
    expect(jest.mocked(notifyHr).mock.calls.map(([n]) => n.email?.template)).toEqual(expect.arrayContaining(['hr-payslip-ready', 'hr-salary-paid']));
    const pdf = await Q.myPayslipPdfBase64({}, { id: line.id }, paid.ctx);
    expect(Buffer.from(pdf, 'base64').subarray(0, 4).toString()).toBe('%PDF');
  });

  it('marks a refused payout FAILED and retries it under a new key', async () => {
    const { finance, paid, runId, hr } = await approvedRun();
    payout.mockRejectedValueOnce(Object.assign(new Error('Insufficient balance in the account'), { extensions: { razorpay_status: 400 } }));
    await M.releaseHrPayrollRun({}, { id: runId, pay_on: addDays(todayKey(), 1) }, finance);
    await HrPayrollRunModel.updateOne({ _id: runId }, { $set: { pay_on: todayKey() } });
    await dispatchRun(new Types.ObjectId(runId));
    const failed = await lineFor(runId, hr, paid.id);
    expect(failed.payout).toMatchObject({ status: 'FAILED', attempt: 1, failure_reason: 'Insufficient balance in the account' });
    expect(jest.mocked(notifyHr).mock.calls.at(-1)?.[0].title).toBe('Salary payout failed for Meera Nair');

    const retried = await M.retryHrPayrollPayout({}, { line_id: failed.id }, finance);
    expect(retried.payout).toMatchObject({ status: 'PROCESSING', attempt: 2 });
    expect(payout.mock.calls.at(-1)?.[0].idempotencyKey).toMatch(/:2$/);
  });

  it('keeps an unreleased payslip away from the employee and another person\'s payslip out of reach', async () => {
    const { hr, paid } = await staff();
    const other = await employee(hr, 'Ravi', { bank: BANK });
    const run = await M.createHrPayrollRun({}, { month: OCT }, hr);
    expect(await Q.myPayslips({}, {}, paid.ctx)).toEqual([]);
    const othersLine = await lineFor(run.id, hr, other.id);
    await expect(Q.myPayslip({}, { id: othersLine.id }, paid.ctx)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('the scheduler', () => {
  it('drafts nothing while switched off, then exactly one run inside the drafting window', async () => {
    const { hr } = await staff();
    expect(await draftDueRuns()).toEqual([]);
    const day = Number(todayKey().slice(8, 10));
    await M.updateHrPayrollSettings({}, { input: { scheduler_enabled: true, pay_timing: 'SAME_MONTH', pay_day: day, draft_lead_days: 1, payout_mode: 'IMPS' } }, hr);
    const month = todayKey().slice(0, 7);
    expect(await draftDueRuns()).toEqual([month]);
    expect(await draftDueRuns()).toEqual([]);
    const runs = await HrPayrollRunModel.find({ live: true }).lean();
    expect(runs.map((r) => [r.month, r.source])).toEqual([[month, 'SCHEDULER']]);
    expect(jest.mocked(notifyHr).mock.calls.at(-1)?.[0].title).toContain('is ready to review');
  });
});

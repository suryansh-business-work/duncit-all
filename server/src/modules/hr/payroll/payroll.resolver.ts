import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { runTableQuery, type TableQueryInput } from '@utils/table-query';
import { isPayoutConfigured } from '@modules/finance/payout/razorpayX.gateway';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { todayKey } from '@modules/hr/employee/employee.events';
import { EMPLOYEE_SELF_ROLES, HR_ROLES } from '@modules/hr/hr.roles';
import { HrPayrollEventModel, HrPayrollLineModel, HrPayrollRunModel, type IPayrollEvent, type IPayrollLine, type IPayrollRun } from './payroll.model';
import { LINE_TABLE_CONFIG, RUN_TABLE_CONFIG, toLine, toRun } from './payroll.mapper';
import { inputsChangedSince, loadRun, payrollRunService } from './payroll.service';
import { payrollReleaseService } from './payroll.release';
import { payrollSettingsService, type IHrPayrollSettings } from './payroll.settings';
import { payslipService } from './payroll.payslip';
import { PAYROLL_READ_ROLES, PAYROLL_RELEASE_ROLES, payrollActor } from './payroll.history';
import { draftDateFor, isPayable, payDateFor, shiftMonth } from './payroll.rules';

/**
 * Four gates: HR prepares and approves; Finance (Super Admin, Finance Manager)
 * releases and pays; both read runs; an employee reads only their own
 * published payslips. The two-person rule for release is checked in the
 * service, against the account that approved.
 */
type Ctx = GraphQLContext;
type IdArgs = { id: string };
type TableArgs = { query?: TableQueryInput | null };

const hr = (ctx: Ctx) => requireRole(ctx, HR_ROLES);
const reader = (ctx: Ctx) => requireRole(ctx, PAYROLL_READ_ROLES);
const finance = (ctx: Ctx) => requireRole(ctx, PAYROLL_RELEASE_ROLES);
const self = (ctx: Ctx) => requireRole(ctx, EMPLOYEE_SELF_ROLES);
const SEND_BACK_ROLES = [...new Set([...HR_ROLES, ...PAYROLL_RELEASE_ROLES])];

/** The first run (of last month, this one or the next) whose pay day has not passed. */
function upcomingOf(settings: IHrPayrollSettings, today = todayKey()) {
  const current = today.slice(0, 7);
  for (const month of [shiftMonth(current, -1), current, shiftMonth(current, 1)]) {
    const pay = payDateFor(month, settings.pay_timing, settings.pay_day);
    if (pay >= today) return { month, draft_date: draftDateFor(month, settings), pay_date: pay };
  }
  return null;
}

async function settingsView(settings: IHrPayrollSettings) {
  return {
    scheduler_enabled: settings.scheduler_enabled,
    pay_timing: settings.pay_timing,
    pay_day: settings.pay_day,
    draft_lead_days: settings.draft_lead_days,
    payout_mode: settings.payout_mode,
    payouts_configured: await isPayoutConfigured(),
    upcoming: upcomingOf(settings),
    updated_at: settings.updated_at?.toISOString?.() ?? null,
  };
}

async function payoutSummary(runId: string) {
  const lines = await HrPayrollLineModel.find({ run_id: objectId(runId, 'payroll run') }).select('hold bank payout.status').lean<IPayrollLine[]>();
  const summary = { paid: 0, processing: 0, failed: 0, waiting: 0, held: 0 };
  for (const line of lines) {
    if (line.hold) summary.held += 1;
    else if (line.payout?.status === 'PAID') summary.paid += 1;
    else if (line.payout?.status === 'FAILED') summary.failed += 1;
    else if (line.payout) summary.processing += 1;
    else if (line.bank) summary.waiting += 1;
  }
  return summary;
}

/** What releasing pays now, by the same rule the payout dispatch uses. */
async function payableOf(runId: string) {
  const lines = await HrPayrollLineModel.find({ run_id: objectId(runId, 'payroll run') }).select('hold issues net_paise').lean<IPayrollLine[]>();
  const payable = lines.filter(isPayable);
  return { count: payable.length, net: payable.reduce((sum, l) => sum + l.net_paise, 0) / 100, held: lines.filter((l) => l.hold).length };
}

const runView = (run: IPayrollRun) => toRun(run);

export const hrPayrollResolvers = {
  HrPayrollRun: {
    needs_recompute: async (run: { id: string; status: string }) => {
      if (run.status !== 'DRAFT') return false;
      return inputsChangedSince(await loadRun(run.id));
    },
    payout_summary: async (run: { id: string }) => payoutSummary(run.id),
    payable: async (run: { id: string }) => payableOf(run.id),
  },
  Query: {
    hrPayrollRunsTable: async (_p: unknown, args: TableArgs, ctx: Ctx) => {
      reader(ctx);
      const page = await runTableQuery<IPayrollRun>(HrPayrollRunModel, { live: true }, args.query ?? undefined, RUN_TABLE_CONFIG);
      return { rows: page.docs.map(runView), total: page.total, page: page.page, page_size: page.page_size };
    },
    hrPayrollRun: async (_p: unknown, args: IdArgs, ctx: Ctx) => {
      reader(ctx);
      return runView(await loadRun(args.id));
    },
    hrPayrollLinesTable: async (_p: unknown, args: TableArgs & { run_id: string }, ctx: Ctx) => {
      reader(ctx);
      const run = await loadRun(args.run_id);
      const page = await runTableQuery<IPayrollLine>(HrPayrollLineModel, { run_id: run._id }, args.query ?? undefined, LINE_TABLE_CONFIG, {
        projection: { 'bank.account_number_sealed': 0 },
      });
      return { rows: page.docs.map(toLine), total: page.total, page: page.page, page_size: page.page_size };
    },
    hrPayrollLine: async (_p: unknown, args: IdArgs, ctx: Ctx) => {
      reader(ctx);
      const line = await HrPayrollLineModel.findById(objectId(args.id, 'payroll line')).select({ 'bank.account_number_sealed': 0 }).lean<IPayrollLine>();
      return line ? toLine(line) : fail('NOT_FOUND', 'Payroll line not found');
    },
    hrPayrollRunHistory: async (_p: unknown, args: IdArgs, ctx: Ctx) => {
      reader(ctx);
      const events = await HrPayrollEventModel.find({ run_id: objectId(args.id, 'payroll run') }).sort({ created_at: -1 }).limit(300).lean<(IPayrollEvent & { _id: unknown })[]>();
      return events.map((e) => ({ id: String(e._id), action: e.action, actor: e.actor.name, line_id: e.line_id ? String(e.line_id) : null, note: e.note, created_at: e.created_at?.toISOString?.() ?? null }));
    },
    hrPayrollSettings: async (_p: unknown, _a: unknown, ctx: Ctx) => {
      reader(ctx);
      return settingsView(await payrollSettingsService.get());
    },
    hrPayslipPdfBase64: async (_p: unknown, args: { line_id: string }, ctx: Ctx) => {
      reader(ctx);
      return payslipService.hrPdf(args.line_id);
    },
    myPayslips: async (_p: unknown, _a: unknown, ctx: Ctx) => payslipService.mine(self(ctx).id),
    myPayslip: async (_p: unknown, args: IdArgs, ctx: Ctx) => payslipService.one(self(ctx).id, args.id),
    myPayslipPdfBase64: async (_p: unknown, args: IdArgs, ctx: Ctx) => payslipService.myPdf(self(ctx).id, args.id),
  },
  Mutation: {
    createHrPayrollRun: async (_p: unknown, args: { month: string }, ctx: Ctx) =>
      runView(await payrollRunService.create(args.month, await payrollActor(hr(ctx)), 'MANUAL')),
    recomputeHrPayrollRun: async (_p: unknown, args: IdArgs & { expected_revision: number }, ctx: Ctx) =>
      runView(await payrollRunService.recompute(args.id, args.expected_revision, hr(ctx))),
    addHrPayrollAdjustment: async (_p: unknown, args: { line_id: string; input: unknown }, ctx: Ctx) =>
      toLine(await payrollRunService.addAdjustment(args.line_id, args.input, hr(ctx))),
    removeHrPayrollAdjustment: async (_p: unknown, args: { line_id: string; adjustment_id: string }, ctx: Ctx) =>
      toLine(await payrollRunService.removeAdjustment(args.line_id, args.adjustment_id, hr(ctx))),
    holdHrPayrollLine: async (_p: unknown, args: { line_id: string; reason: string }, ctx: Ctx) =>
      toLine(await payrollRunService.hold(args.line_id, { reason: args.reason }, hr(ctx))),
    unholdHrPayrollLine: async (_p: unknown, args: { line_id: string }, ctx: Ctx) => toLine(await payrollRunService.unhold(args.line_id, hr(ctx))),
    approveHrPayrollRun: async (_p: unknown, args: IdArgs & { expected_revision: number; note?: string | null }, ctx: Ctx) =>
      runView(await payrollRunService.approve(args.id, args.expected_revision, { note: args.note }, hr(ctx))),
    returnHrPayrollRun: async (_p: unknown, args: IdArgs & { note: string }, ctx: Ctx) =>
      runView(await payrollRunService.sendBack(args.id, { note: args.note }, requireRole(ctx, SEND_BACK_ROLES))),
    deleteHrPayrollRun: async (_p: unknown, args: IdArgs, ctx: Ctx) => payrollRunService.remove(args.id, hr(ctx)),
    updateHrPayrollSettings: async (_p: unknown, args: { input: unknown }, ctx: Ctx) =>
      settingsView(await payrollSettingsService.update(args.input, hr(ctx).id)),
    releaseHrPayrollRun: async (_p: unknown, args: IdArgs & { pay_on: string; note?: string | null; expected_revision?: number | null }, ctx: Ctx) =>
      runView(await payrollReleaseService.release(args.id, { pay_on: args.pay_on, note: args.note, expected_revision: args.expected_revision }, finance(ctx))),
    retryHrPayrollPayout: async (_p: unknown, args: { line_id: string }, ctx: Ctx) => toLine(await payrollReleaseService.retry(args.line_id, finance(ctx))),
    payHeldHrPayrollLine: async (_p: unknown, args: { line_id: string; note?: string | null }, ctx: Ctx) =>
      toLine(await payrollReleaseService.payHeld(args.line_id, args.note?.trim() || null, finance(ctx))),
  },
};

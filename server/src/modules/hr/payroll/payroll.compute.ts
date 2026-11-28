/**
 * Turn a month into payroll lines: load who was employed, the pay revisions,
 * approved unpaid leave, pending leave and reviewed targets in a fixed number
 * of queries (never one per employee), then hand each person to the pure rules.
 */
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { HrCompensationModel, type IHrCompensation } from '@modules/hr/employee/compensation.model';
import { EmployeeTargetModel, type IEmployeeTarget } from '@modules/targets/employeeTarget/employeeTarget.model';
import { HrLeaveRequestModel, type IHrLeaveRequest } from '@modules/hr/leave/leave.model';
import { firstDayOf, lastDayOf } from '@modules/hr/leave/leave.rules';
import { HrPayrollRunModel, HrPayrollVariableClaimModel, type IPayrollLine, type IPayrollRun, type IPayrollVariable } from './payroll.model';
import {
  PAYOUT_CURRENCY,
  earnMonth,
  employedWindow,
  isFixed,
  isTargetLinked,
  issuesFor,
  lineTotals,
  variableFor,
  type EarnedLine,
} from './payroll.rules';

type Unpaid = Map<string, number>;

interface MonthInputs {
  employees: IHrEmployee[];
  revisions: Map<string, IHrCompensation[]>;
  unpaid: Map<string, Unpaid>;
  pendingLeave: Set<string>;
  reviewed: Map<string, IEmployeeTarget[]>;
  unreviewed: Set<string>;
}

const key = (id: Types.ObjectId | string) => String(id);

function groupBy<T>(rows: readonly T[], of: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) out.set(of(row), [...(out.get(of(row)) ?? []), row]);
  return out;
}

/** Everyone employed on at least one day of the month who has ever had a pay revision. */
async function employeesFor(month: string): Promise<IHrEmployee[]> {
  const docs = await HrEmployeeModel.find({
    'job.date_of_joining': { $lte: lastDayOf(month) },
    $or: [{ status: { $in: ['ACTIVE', 'ON_NOTICE'] } }, { status: 'EXITED', 'exit.last_working_day': { $gte: firstDayOf(month) } }],
  }).lean<IHrEmployee[]>();
  const paid = new Set(
    (await HrCompensationModel.distinct('employee_id', { employee_id: { $in: docs.map((d) => d._id) } })).map(String)
  );
  return docs.filter((doc) => paid.has(key(doc._id)));
}

/**
 * The first payroll month this console paid. Variable pay never reaches back
 * before it: those months were paid outside payroll, and sweeping them up in a
 * first run would pay them twice.
 */
async function variableFloor(month: string, runId: Types.ObjectId | null): Promise<string> {
  const first = await HrPayrollRunModel.findOne({ live: true, ...(runId ? { _id: { $ne: runId } } : {}) })
    .sort({ month: 1 })
    .select('month')
    .lean<Pick<IPayrollRun, 'month'>>();
  return first && first.month < month ? first.month : month;
}

async function loadInputs(month: string, runId: Types.ObjectId | null): Promise<MonthInputs> {
  const employees = await employeesFor(month);
  const ids = employees.map((e) => e._id);
  const userIds = employees.map((e) => e.user_id);
  const floor = await variableFloor(month, runId);
  const [revisions, unpaidRequests, pending, targets] = await Promise.all([
    HrCompensationModel.find({ employee_id: { $in: ids } }).lean<IHrCompensation[]>(),
    HrLeaveRequestModel.find({
      employee_id: { $in: ids },
      status: 'APPROVED',
      leave_type_paid: false,
      end_date: { $gte: firstDayOf(floor) },
      start_date: { $lte: lastDayOf(month) },
    })
      .select('employee_id day_breakdown')
      .lean<Pick<IHrLeaveRequest, 'employee_id' | 'day_breakdown'>[]>(),
    HrLeaveRequestModel.distinct('employee_id', {
      employee_id: { $in: ids },
      status: 'PENDING',
      end_date: { $gte: firstDayOf(month) },
      start_date: { $lte: lastDayOf(month) },
    }),
    EmployeeTargetModel.find({ live: true, 'employee.user_id': { $in: userIds }, month: { $gte: floor, $lte: month } })
      .select('employee.user_id month status submission.completion_percent')
      .lean<IEmployeeTarget[]>(),
  ]);
  const claimedElsewhere = await HrPayrollVariableClaimModel.find({
    target_id: { $in: targets.map((t) => t._id) },
    ...(runId ? { run_id: { $ne: runId } } : {}),
  })
    .select('target_id')
    .lean<{ target_id: Types.ObjectId }[]>();
  const claimed = new Set(claimedElsewhere.map((claim) => key(claim.target_id)));
  const unpaid = new Map<string, Unpaid>();
  for (const request of unpaidRequests) {
    const days = unpaid.get(key(request.employee_id)) ?? new Map<string, number>();
    for (const day of request.day_breakdown) days.set(day.date, (days.get(day.date) ?? 0) + day.days);
    unpaid.set(key(request.employee_id), days);
  }
  const byUser = new Map(employees.map((e) => [key(e.user_id), key(e._id)]));
  const reviewed = groupBy(
    targets.filter((t) => t.status === 'REVIEWED' && t.submission && !claimed.has(key(t._id))),
    (t) => byUser.get(key(t.employee.user_id)) ?? ''
  );
  const unreviewed = new Set(
    targets.filter((t) => t.status !== 'REVIEWED' && t.month === month).map((t) => byUser.get(key(t.employee.user_id)) ?? '')
  );
  return {
    employees,
    revisions: groupBy(revisions, (r) => key(r.employee_id)),
    unpaid,
    pendingLeave: new Set(pending.map(String)),
    reviewed,
    unreviewed,
  };
}

const amounts = (lines: EarnedLine[], type: EarnedLine['type']) =>
  lines.filter((l) => l.type === type).map((l) => ({ label: l.label, monthly_paise: l.monthly_paise, amount_paise: l.amount_paise }));

export const newLineRef = () => `pr_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

/** The parts of a line a recompute keeps: HR's own adjustments, a hold, and the payout reference. */
export type KeptParts = Pick<IPayrollLine, 'adjustments' | 'hold' | 'line_ref'>;

export type ComputedLine = Omit<IPayrollLine, '_id' | 'created_at' | 'updated_at'>;

function lineFor(employee: IHrEmployee, month: string, runId: Types.ObjectId, inputs: MonthInputs, kept: KeptParts | undefined): ComputedLine | null {
  const id = key(employee._id);
  const window = employedWindow(month, employee.job.date_of_joining, employee.exit?.last_working_day ?? null);
  if (!window) return null;
  const revisions = inputs.revisions.get(id) ?? [];
  const unpaid = inputs.unpaid.get(id) ?? new Map<string, number>();
  const fixed = earnMonth(month, window, revisions, unpaid, isFixed);
  const variable: IPayrollVariable[] = (inputs.reviewed.get(id) ?? []).flatMap((target) => {
    const targetWindow = employedWindow(target.month, employee.job.date_of_joining, employee.exit?.last_working_day ?? null);
    const earned = earnMonth(target.month, targetWindow, revisions, unpaid, isTargetLinked);
    const percent = target.submission?.completion_percent ?? 0;
    return variableFor(earned, percent).map((item) => ({ ...item, target_id: target._id, target_month: target.month, completion_percent: percent }));
  });
  const parts = {
    earnings: amounts(fixed.lines, 'EARNING'),
    variable,
    deductions: amounts(fixed.lines, 'DEDUCTION'),
    employer: amounts(fixed.lines, 'EMPLOYER_CONTRIBUTION'),
    adjustments: kept?.adjustments ?? [],
  };
  const totals = lineTotals(parts);
  const currency = fixed.last_revision?.currency ?? PAYOUT_CURRENCY;
  const hasTargetPay = revisions.some((r) => r.components.some(isTargetLinked));
  const bank = employee.bank;
  return {
    run_id: runId,
    month,
    line_ref: kept?.line_ref ?? newLineRef(),
    employee_id: employee._id,
    user_id: employee.user_id,
    employee: {
      name: `${employee.personal.first_name} ${employee.personal.last_name}`.trim(),
      code: employee.employee_code,
      email: employee.job.work_email ?? employee.personal.personal_email ?? null,
      job_title: employee.job.job_title,
      department: employee.job.department ?? null,
      date_of_joining: employee.job.date_of_joining,
      last_working_day: employee.exit?.last_working_day ?? null,
    },
    currency,
    compensation_id: fixed.last_revision?._id ?? null,
    days_in_month: fixed.days_in_month,
    payable_days: fixed.payable_days,
    lop_days: fixed.lop_days,
    ...parts,
    ...totals,
    issues: issuesFor({
      coveredDays: fixed.covered_days,
      currency,
      hasBank: Boolean(bank?.account_number_sealed && bank.ifsc),
      netPaise: totals.net_paise,
      pendingLeave: inputs.pendingLeave.has(id),
      unreviewedVariable: hasTargetPay && inputs.unreviewed.has(id),
    }),
    hold: kept?.hold ?? null,
    bank: null,
    payout: null,
    published: false,
  };
}

/** Every line a month's run should hold, keeping what HR added to the lines it already had. */
export async function computeLines(month: string, runId: Types.ObjectId, kept: Map<string, KeptParts>): Promise<ComputedLine[]> {
  const inputs = await loadInputs(month, runId);
  return inputs.employees.flatMap((employee) => {
    const line = lineFor(employee, month, runId, inputs, kept.get(key(employee._id)));
    return line ? [line] : [];
  });
}

export function runTotals(lines: readonly Pick<IPayrollLine, 'hold' | 'gross_paise' | 'deductions_paise' | 'net_paise' | 'employer_paise'>[]) {
  return lines.reduce(
    (t, l) => ({
      employees: t.employees + 1,
      held: t.held + (l.hold ? 1 : 0),
      gross_paise: t.gross_paise + l.gross_paise,
      deductions_paise: t.deductions_paise + l.deductions_paise,
      net_paise: t.net_paise + l.net_paise,
      employer_paise: t.employer_paise + l.employer_paise,
    }),
    { employees: 0, held: 0, gross_paise: 0, deductions_paise: 0, net_paise: 0, employer_paise: 0 }
  );
}

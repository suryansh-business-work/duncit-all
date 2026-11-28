/**
 * The Employee console's calendar: one read per month that puts holidays,
 * weekly offs, the caller's leave, their team's leave (for a manager), the
 * salary day and their target's due date side by side.
 *
 * Every event carries data, not a sentence — a kind, dates, a name and the
 * month it refers to — so the console writes the words from its own
 * localized copy.
 */
import { Types } from 'mongoose';
import { z } from 'zod';
import { parseInput, parseMonthKey, windowEndDayKey } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { EmployeeTargetModel, type IEmployeeTarget } from '@modules/targets/employeeTarget/employeeTarget.model';
import { employeeTargetSettingsService } from '@modules/targets/employeeTarget/employeeTarget.settings';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { HrLeaveRequestModel, type IHrLeaveRequest } from '@modules/hr/leave/leave.model';
import { leaveSettingsService } from '@modules/hr/leave/leave.settings';
import { firstDayOf, lastDayOf } from '@modules/hr/leave/leave.rules';
import { HrPayrollLineModel, HrPayrollRunModel, type IPayrollRun } from '@modules/hr/payroll/payroll.model';
import { payrollSettingsService } from '@modules/hr/payroll/payroll.settings';
import { payDateFor, shiftMonth } from '@modules/hr/payroll/payroll.rules';

export type CalendarEventKind = 'HOLIDAY' | 'LEAVE' | 'TEAM_LEAVE' | 'PAYDAY' | 'TARGET_DUE';

export interface CalendarEvent {
  kind: CalendarEventKind;
  start_date: string;
  end_date: string;
  /** The holiday, the leave type, or (team leave) the colleague. */
  name: string | null;
  /** The leave type, on team leave. */
  detail: string | null;
  /** Leave status; for a payday, whether that month's payroll is SCHEDULED or still EXPECTED. */
  status: string | null;
  half_day: string | null;
  /** The payroll or target month the event is about. */
  ref_month: string | null;
}

const monthArgs = z.object({ month: z.string().refine((v) => parseMonthKey(v) !== null, 'Use a YYYY-MM month') });

const leaveEvent = (request: IHrLeaveRequest, team: boolean): CalendarEvent => ({
  kind: team ? 'TEAM_LEAVE' : 'LEAVE',
  start_date: request.start_date,
  end_date: request.end_date,
  name: team ? request.employee_name : request.leave_type_name,
  detail: team ? request.leave_type_name : null,
  status: request.status,
  half_day: request.half_day,
  ref_month: null,
});

const overlapping = (from: string, to: string) => ({ status: { $in: ['PENDING', 'APPROVED'] }, start_date: { $lte: to }, end_date: { $gte: from } });

/**
 * Salary days that fall in this month: a released run's own pay date, or the
 * date the settings point at for a run not released yet. Only shown to someone
 * paid in that run (a line), or — before any run exists — to anyone on record.
 */
async function paydays(month: string, employee: IHrEmployee | null): Promise<CalendarEvent[]> {
  if (!employee) return [];
  const settings = await payrollSettingsService.get();
  const from = firstDayOf(month);
  const to = lastDayOf(month);
  const candidates = [shiftMonth(month, -1), month];
  const runs = await HrPayrollRunModel.find({ live: true, month: { $in: candidates } }).lean<IPayrollRun[]>();
  const events: CalendarEvent[] = [];
  for (const payrollMonth of candidates) {
    const run = runs.find((r) => r.month === payrollMonth);
    const date = run?.pay_on ?? payDateFor(payrollMonth, settings.pay_timing, settings.pay_day);
    if (date < from || date > to) continue;
    if (run && !(await HrPayrollLineModel.exists({ run_id: run._id, employee_id: employee._id }))) continue;
    events.push({
      kind: 'PAYDAY',
      start_date: date,
      end_date: date,
      name: null,
      detail: null,
      status: run?.pay_on ? 'SCHEDULED' : 'EXPECTED',
      half_day: null,
      ref_month: payrollMonth,
    });
  }
  return events;
}

/** The last day to report on a target that is still waiting for its report. */
async function targetDue(month: string, userId: string): Promise<CalendarEvent[]> {
  const window = await employeeTargetSettingsService.window();
  const targets = await EmployeeTargetModel.find({
    live: true,
    'employee.user_id': new Types.ObjectId(userId),
    month: { $in: [shiftMonth(month, -1), month] },
    status: 'ASSIGNED',
  })
    .select('month')
    .lean<Pick<IEmployeeTarget, 'month'>[]>();
  return targets.flatMap((target) => {
    const due = windowEndDayKey(target.month, window);
    if (!due || due.slice(0, 7) !== month) return [];
    return [{ kind: 'TARGET_DUE' as const, start_date: due, end_date: due, name: null, detail: null, status: null, half_day: null, ref_month: target.month }];
  });
}

export async function myCalendar(userId: string, raw: unknown) {
  const { month } = parseInput(monthArgs, raw);
  const from = firstDayOf(month);
  const to = lastDayOf(month);
  const employee = await HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
  const reports = employee
    ? (await HrEmployeeModel.find({ 'job.manager_id': employee._id }).select('_id').lean<Pick<IHrEmployee, '_id'>[]>()).map((r) => r._id)
    : [];
  const [settings, holidays, mine, team, pay, due] = await Promise.all([
    leaveSettingsService.get(),
    leaveSettingsService.holidays(from, to),
    employee ? HrLeaveRequestModel.find({ employee_id: employee._id, ...overlapping(from, to) }).lean<IHrLeaveRequest[]>() : [],
    reports.length ? HrLeaveRequestModel.find({ employee_id: { $in: reports }, ...overlapping(from, to) }).lean<IHrLeaveRequest[]>() : [],
    paydays(month, employee),
    targetDue(month, userId),
  ]);
  const events: CalendarEvent[] = [
    ...holidays.map((h) => ({ kind: 'HOLIDAY' as const, start_date: h.date, end_date: h.date, name: h.name, detail: null, status: null, half_day: null, ref_month: null })),
    ...mine.map((r) => leaveEvent(r, false)),
    ...team.map((r) => leaveEvent(r, true)),
    ...pay,
    ...due,
  ].sort((a, b) => a.start_date.localeCompare(b.start_date));
  return { month, weekly_off_days: settings.weekly_off_days, is_manager: reports.length > 0, events };
}

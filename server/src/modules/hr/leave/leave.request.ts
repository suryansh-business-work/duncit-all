/**
 * Asking for leave and taking it back.
 *
 * A request is addressed by the session's own account — never an id from the
 * client — and is checked in this order: the person is employed on those
 * dates, the type is offered, the dates cost at least one working day, unpaid
 * leave does not touch a month whose payroll is signed off, and a paid type has
 * the balance. The overlap guard is the day-claim index, not a read-then-write,
 * so two requests racing for the same morning cannot both land.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { withTransaction } from '@utils/mongoTransaction';
import { duplicateKeyOn, isDuplicateKeyError } from '@utils/mongo-error';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrActor, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { actorOf, todayKey } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { lockedPayrollMonths } from '@modules/hr/payroll/payroll.model';
import { HrLeaveDayClaimModel, HrLeaveRequestModel, type IHrLeaveRequest, type IHrLeaveType } from './leave.model';
import { figuresFor, loadLedger } from './leave.balance';
import { leaveSettingsService, type IHrLeaveSettings } from './leave.settings';
import { leaveTypeService } from './leave.types';
import { notifyLeaveCancelled, notifyLeaveRequested } from './leave.notify';
import {
  HR_LEAVE_LIMITS,
  addDays,
  availableOf,
  leaveCancelSchema,
  leaveRequestSchema,
  leaveYearOf,
  leaveYearRange,
  partsFor,
  requestDays,
  totalDays,
  type LeaveRequestInput,
} from './leave.rules';

export async function ownEmployee(userId: string): Promise<IHrEmployee> {
  const doc = await HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
  return doc ?? fail('NOT_FOUND', 'HR has not added your employee record yet');
}

function checkWindow(input: LeaveRequestInput, employee: IHrEmployee, settings: IHrLeaveSettings, today: string) {
  if (input.start_date < addDays(today, -settings.backdate_days)) {
    fail('BAD_USER_INPUT', `Leave can be asked for at most ${settings.backdate_days} days back`);
  }
  if (input.start_date > addDays(today, HR_LEAVE_LIMITS.aheadMax)) fail('BAD_USER_INPUT', 'Leave can be asked for at most a year ahead');
  if (input.start_date < employee.job.date_of_joining) fail('BAD_USER_INPUT', 'Leave cannot start before the joining date');
  const lastDay = employee.exit?.last_working_day;
  if (lastDay && input.end_date > lastDay) fail('BAD_USER_INPUT', 'Leave cannot run past the last working day');
}

const monthsOf = (dates: Iterable<string>) => [...new Set([...dates].map((date) => date.slice(0, 7)))];

/** Unpaid leave changes pay, so it cannot move inside a month whose payroll HR has signed off. */
export async function assertMonthsOpen(dates: Iterable<string>): Promise<void> {
  const locked = await lockedPayrollMonths(monthsOf(dates));
  if (locked.length > 0) {
    fail('BAD_USER_INPUT', `Payroll for ${locked.sort().join(', ')} is already approved, so unpaid leave in that month cannot change`);
  }
}

/**
 * Enough of a paid type left in every leave year the dates fall in, each year
 * checked as of its last requested date. `days` holds the request's own cost;
 * when it is already counted as pending, pass an empty map and this checks the
 * balance has not gone below zero since.
 */
export async function assertBalance(employee: IHrEmployee, type: IHrLeaveType, days: ReadonlyMap<string, number>, dates: readonly string[]) {
  const settings = await leaveSettingsService.get();
  const startMonth = settings.leave_year_start_month;
  const today = todayKey();
  const byYear = new Map<number, { need: number; last: string }>();
  for (const date of dates) {
    const year = leaveYearOf(date, startMonth);
    const entry = byYear.get(year) ?? { need: 0, last: date };
    byYear.set(year, { need: entry.need + (days.get(date) ?? 0), last: date > entry.last ? date : entry.last });
  }
  const ledger = await loadLedger(employee, Math.max(...byYear.keys()));
  for (const [year, { need, last }] of byYear) {
    const yearEnd = leaveYearRange(year, startMonth).to;
    const asOf = last > today ? last : today;
    const available = availableOf(figuresFor(type, ledger, year, asOf < yearEnd ? asOf : yearEnd));
    if (available - need < -1e-9) {
      fail('BAD_USER_INPUT', `Not enough ${type.name} left: ${Math.max(0, available)} day(s) available, this needs ${need}`);
    }
  }
}

/** The reporting manager who decides, or null when HR does (no manager, or the manager has left). */
async function approverOf(employee: IHrEmployee): Promise<Types.ObjectId | null> {
  const managerId = employee.job.manager_id;
  if (!managerId) return null;
  const manager = await HrEmployeeModel.findById(managerId).select('status').lean<Pick<IHrEmployee, 'status'>>();
  return manager && manager.status !== 'EXITED' ? managerId : null;
}

async function existingFor(userId: string, clientRequestId: string | null): Promise<IHrLeaveRequest | null> {
  if (!clientRequestId) return null;
  return HrLeaveRequestModel.findOne({ user_id: new Types.ObjectId(userId), client_request_id: clientRequestId }).lean<IHrLeaveRequest>();
}

/** Which of the dates someone else's live request already holds — for a message that names one. */
async function takenDate(employeeId: Types.ObjectId, dates: string[]): Promise<string | null> {
  const claim = await HrLeaveDayClaimModel.findOne({ employee_id: employeeId, date: { $in: dates } })
    .sort({ date: 1 })
    .select('date')
    .lean<{ date: string }>();
  return claim?.date ?? null;
}

interface CreateArgs {
  employee: IHrEmployee;
  type: IHrLeaveType;
  input: LeaveRequestInput;
  days: Map<string, number>;
  approver: Types.ObjectId | null;
  actor: IHrActor;
}

async function createWithClaims({ employee, type, input, days, approver, actor }: CreateArgs): Promise<IHrLeaveRequest> {
  const id = new Types.ObjectId();
  const claims = [...days.keys()].flatMap((date) =>
    partsFor(input.half_day).map((part) => ({ employee_id: employee._id, date, part, request_id: id }))
  );
  const doc = {
    _id: id,
    employee_id: employee._id,
    user_id: employee.user_id,
    employee_name: `${employee.personal.first_name} ${employee.personal.last_name}`.trim(),
    employee_code: employee.employee_code,
    leave_type_id: type._id,
    leave_type_name: type.name,
    leave_type_paid: type.paid,
    start_date: input.start_date,
    end_date: input.end_date,
    half_day: input.half_day,
    days: totalDays(days),
    day_breakdown: [...days].map(([date, d]) => ({ date, days: d })),
    reason: input.reason,
    status: 'PENDING' as const,
    approver_employee_id: approver,
    client_request_id: input.client_request_id,
    created_by: actor,
  };
  try {
    await withTransaction(async (session) => {
      await HrLeaveRequestModel.create([doc], { session });
      await HrLeaveDayClaimModel.insertMany(claims, { session, ordered: true });
    });
  } catch (error) {
    // Without a transaction (a standalone mongod) the half-written request is undone by hand.
    await HrLeaveDayClaimModel.deleteMany({ request_id: id });
    await HrLeaveRequestModel.deleteOne({ _id: id });
    if (!isDuplicateKeyError(error)) throw error;
    if (duplicateKeyOn(error, 'client_request_id')) {
      const prior = await existingFor(String(employee.user_id), input.client_request_id);
      if (prior) return prior;
    }
    const date = await takenDate(employee._id, [...days.keys()]);
    return fail('CONFLICT', date ? `You already have leave on ${date}` : 'You already have leave on one of these dates');
  }
  const saved = await HrLeaveRequestModel.findById(id).lean<IHrLeaveRequest>();
  return saved ?? fail('NOT_FOUND', 'The leave request could not be read back');
}

export const leaveRequestService = {
  async apply(userId: string, raw: unknown): Promise<IHrLeaveRequest> {
    const input = parseInput(leaveRequestSchema, raw);
    const prior = await existingFor(userId, input.client_request_id);
    if (prior) return prior;
    const employee = await ownEmployee(userId);
    if (employee.status === 'EXITED') fail('BAD_USER_INPUT', 'Your employment has ended, so you cannot ask for leave');
    const type = await leaveTypeService.byId(input.leave_type_id);
    if (!type.active) fail('BAD_USER_INPUT', `${type.name} is no longer offered`);
    if (input.half_day && !type.allow_half_day) fail('BAD_USER_INPUT', `${type.name} cannot be taken as a half day`);
    const settings = await leaveSettingsService.get();
    checkWindow(input, employee, settings, todayKey());
    const rules = await leaveSettingsService.workingDayRules(input.start_date, input.end_date);
    const days = requestDays(input.start_date, input.end_date, input.half_day, rules);
    if (days.size === 0) fail('BAD_USER_INPUT', 'Every date you picked is a weekly off or a holiday');
    if (type.paid) await assertBalance(employee, type, days, [...days.keys()]);
    else await assertMonthsOpen(days.keys());
    const created = await createWithClaims({
      employee,
      type,
      input,
      days,
      approver: await approverOf(employee),
      actor: await actorOf({ id: userId }),
    });
    logs.server.info('leave.request', 'applied', { userId, requestId: String(created._id), days: created.days, type: type.code });
    await notifyLeaveRequested(created);
    return created;
  },

  /** The employee's own cancel: anything still waiting, or approved leave that has not started. */
  async cancelOwn(userId: string, id: string, raw: unknown): Promise<IHrLeaveRequest> {
    const { note } = parseInput(leaveCancelSchema, raw);
    const doc = await HrLeaveRequestModel.findOne({ _id: objectId(id, 'leave request'), user_id: new Types.ObjectId(userId) }).lean<IHrLeaveRequest>();
    if (!doc) return fail('NOT_FOUND', 'Leave request not found');
    if (doc.status === 'APPROVED' && doc.start_date <= todayKey()) fail('BAD_USER_INPUT', 'Leave that has already started can only be cancelled by HR');
    return cancel(doc, await actorOf({ id: userId }), note, false);
  },

  /** HR's cancel: any live request, with a reason the employee is shown. */
  async cancelAsHr(id: string, raw: unknown, user: AuthUser): Promise<IHrLeaveRequest> {
    const { note } = parseInput(leaveCancelSchema, raw);
    if (!note || note.length < 3) fail('BAD_USER_INPUT', 'Say why the leave is cancelled');
    const doc = await HrLeaveRequestModel.findById(objectId(id, 'leave request')).lean<IHrLeaveRequest>();
    if (!doc) return fail('NOT_FOUND', 'Leave request not found');
    return cancel(doc, await actorOf(user), note, true);
  },
};

async function cancel(doc: IHrLeaveRequest, by: IHrActor, note: string | null, asHr: boolean): Promise<IHrLeaveRequest> {
  if (doc.status !== 'PENDING' && doc.status !== 'APPROVED') fail('BAD_USER_INPUT', 'This request is already closed');
  if (doc.status === 'APPROVED' && !doc.leave_type_paid) await assertMonthsOpen(doc.day_breakdown.map((d) => d.date));
  const updated = await HrLeaveRequestModel.findOneAndUpdate(
    { _id: doc._id, status: doc.status },
    { $set: { status: 'CANCELLED', cancellation: { by, at: new Date(), note, as_hr: asHr } } },
    { new: true }
  ).lean<IHrLeaveRequest>();
  if (!updated) return fail('CONFLICT', 'This request was changed by someone else. Reload it and try again.');
  await HrLeaveDayClaimModel.deleteMany({ request_id: doc._id });
  logs.server.info('leave.request', 'cancelled', { requestId: String(doc._id), was: doc.status, asHr });
  await notifyLeaveCancelled(updated, doc.status, asHr);
  return updated;
}

import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { todayKey } from '@modules/hr/employee/employee.events';
import { loadEmployee } from '@modules/hr/employee/employee.store';
import { HrLeaveAdjustmentModel, HrLeaveRequestModel, type IHrLeaveAdjustment, type IHrLeaveRequest, type IHrLeaveType } from './leave.model';
import { balancesFor, type TypeBalance } from './leave.balance';
import { callerRecord } from './leave.decision';
import { leaveSettingsService } from './leave.settings';
import { leaveTypeService, toLeaveType } from './leave.types';
import { leaveRequestSchema, leaveYearOf, leaveYearRange, requestDays, totalDays } from './leave.rules';

export const LEAVE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['employee_name', 'employee_code', 'leave_type_name', 'reason'],
  sortFields: {
    start_date: 'start_date',
    end_date: 'end_date',
    days: 'days',
    status: 'status',
    employee_name: 'employee_name',
    leave_type_name: 'leave_type_name',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    leave_type_name: { type: 'string' },
    employee_name: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
  },
  defaultSort: { start_date: -1, created_at: -1 },
};

const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : null);

/** A request as every console reads it. `can_cancel` is what the employee themselves may do. */
export function toLeaveRequest(doc: IHrLeaveRequest, today = todayKey()) {
  return {
    id: String(doc._id),
    employee_id: String(doc.employee_id),
    employee_name: doc.employee_name,
    employee_code: doc.employee_code,
    leave_type_id: String(doc.leave_type_id),
    leave_type_name: doc.leave_type_name,
    paid: doc.leave_type_paid,
    start_date: doc.start_date,
    end_date: doc.end_date,
    half_day: doc.half_day,
    days: doc.days,
    reason: doc.reason,
    status: doc.status,
    /** True when no reporting manager was on record, so HR decides. */
    routed_to_hr: doc.approver_employee_id === null,
    decided_by: doc.decision?.by.name ?? null,
    decided_as_hr: doc.decision?.as_hr ?? null,
    decided_at: iso(doc.decision?.at),
    decision_note: doc.decision?.note ?? null,
    cancelled_by: doc.cancellation?.by.name ?? null,
    cancelled_at: iso(doc.cancellation?.at),
    cancellation_note: doc.cancellation?.note ?? null,
    can_cancel: doc.status === 'PENDING' || (doc.status === 'APPROVED' && doc.start_date > today),
    created_at: iso(doc.created_at),
  };
}

const toAdjustment = (doc: IHrLeaveAdjustment, types: Map<string, IHrLeaveType>) => ({
  id: String(doc._id),
  leave_type_id: String(doc.leave_type_id),
  leave_type_name: types.get(String(doc.leave_type_id))?.name ?? '',
  leave_year: doc.leave_year,
  days: doc.days,
  note: doc.note,
  by: doc.actor.name,
  created_at: iso(doc.created_at),
});

function toBalance(balance: TypeBalance, type: IHrLeaveType) {
  return { leave_type: toLeaveType(type), year: balance.year, ...balance.figures, available: balance.available };
}

async function table(base: Record<string, unknown>, query: TableQueryInput | undefined) {
  const page = await runTableQuery<IHrLeaveRequest>(HrLeaveRequestModel, base, query, LEAVE_TABLE_CONFIG, {
    projection: { client_request_id: 0, day_breakdown: 0 },
  });
  const today = todayKey();
  return { rows: page.docs.map((doc) => toLeaveRequest(doc, today)), total: page.total, page: page.page, page_size: page.page_size };
}

async function directReportIds(managerId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const rows = await HrEmployeeModel.find({ 'job.manager_id': managerId }).select('_id').lean<Pick<IHrEmployee, '_id'>[]>();
  return rows.map((row) => row._id);
}

/** Every listed type's balance, inactive types only when they still hold days or history. */
async function balancesView(employee: IHrEmployee, year?: number) {
  const all = await leaveTypeService.list(true);
  const balances = await balancesFor(employee, all, year);
  const byId = new Map(all.map((type) => [String(type._id), type]));
  return balances
    .filter((b) => {
      const type = byId.get(b.leave_type_id);
      const f = b.figures;
      return type && (type.active || f.taken > 0 || f.pending > 0 || f.adjusted !== 0 || f.carried > 0);
    })
    .flatMap((b) => {
      const type = byId.get(b.leave_type_id);
      return type ? [toBalance(b, type)] : [];
    });
}

export const leaveQueries = {
  /** The Employee console's Leave page in one read. Null until HR has put the caller on record. */
  async myOverview(userId: string) {
    const employee = await HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
    if (!employee) return null;
    const [settings, types, balances, upcoming, reports] = await Promise.all([
      leaveSettingsService.get(),
      leaveTypeService.list(false),
      balancesView(employee),
      HrLeaveRequestModel.find({ employee_id: employee._id, status: { $in: ['PENDING', 'APPROVED'] }, end_date: { $gte: todayKey() } })
        .sort({ start_date: 1 })
        .limit(10)
        .lean<IHrLeaveRequest[]>(),
      directReportIds(employee._id),
    ]);
    const year = leaveYearOf(todayKey(), settings.leave_year_start_month);
    const range = leaveYearRange(year, settings.leave_year_start_month);
    const teamPending = reports.length
      ? await HrLeaveRequestModel.countDocuments({ employee_id: { $in: reports }, status: 'PENDING' })
      : 0;
    return {
      employee_id: String(employee._id),
      can_apply: employee.status !== 'EXITED',
      leave_year: year,
      leave_year_from: range.from,
      leave_year_to: range.to,
      weekly_off_days: settings.weekly_off_days,
      backdate_days: settings.backdate_days,
      types: types.map(toLeaveType),
      balances,
      upcoming: upcoming.map((doc) => toLeaveRequest(doc)),
      is_manager: reports.length > 0,
      team_pending: teamPending,
    };
  },

  myTable(userId: string, query?: TableQueryInput) {
    return table({ user_id: new Types.ObjectId(userId) }, query);
  },

  /** Requests from the caller's direct reports — what a manager decides on. */
  async teamTable(userId: string, query?: TableQueryInput) {
    const caller = await callerRecord(userId);
    const reports = caller ? await directReportIds(caller._id) : [];
    return table({ employee_id: { $in: reports } }, query);
  },

  hrTable(query?: TableQueryInput) {
    return table({}, query);
  },

  /** What a request would cost before it is sent: the working days, and the balance left after. */
  async preview(userId: string, raw: unknown) {
    const input = parseInput(leaveRequestSchema, raw);
    const employee = await HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
    if (!employee) return null;
    const type = await leaveTypeService.byId(input.leave_type_id);
    const rules = await leaveSettingsService.workingDayRules(input.start_date, input.end_date);
    const days = totalDays(requestDays(input.start_date, input.end_date, input.half_day, rules));
    const balance = type.paid ? (await balancesFor(employee, [type]))[0] : null;
    const available = balance?.available ?? null;
    return { days, available, available_after: available === null ? null : Math.round((available - days) * 100) / 100 };
  },

  async hrBalances(employeeId: string, year?: number | null) {
    const employee = await loadEmployee(employeeId);
    const settings = await leaveSettingsService.get();
    const target = year ?? leaveYearOf(todayKey(), settings.leave_year_start_month);
    const [balances, adjustments, types] = await Promise.all([
      balancesView(employee, target),
      HrLeaveAdjustmentModel.find({ employee_id: employee._id, leave_year: target }).sort({ created_at: -1 }).lean<IHrLeaveAdjustment[]>(),
      leaveTypeService.list(true),
    ]);
    const typeMap = new Map(types.map((type) => [String(type._id), type]));
    return {
      employee_id: String(employee._id),
      employee_name: `${employee.personal.first_name} ${employee.personal.last_name}`.trim(),
      year: target,
      balances,
      adjustments: adjustments.map((doc) => toAdjustment(doc, typeMap)),
    };
  },
};

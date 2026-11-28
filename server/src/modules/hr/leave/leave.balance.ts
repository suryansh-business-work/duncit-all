/**
 * Leave balances, always worked out from the records — what a type grants,
 * what was carried in, HR's adjustments, and the approved and pending
 * requests — never kept as a running counter that could drift from them.
 */
import type { Types } from 'mongoose';
import type { IHrEmployee } from '@modules/hr/employee/employee.model';
import { todayKey } from '@modules/hr/employee/employee.events';
import { HrLeaveAdjustmentModel, HrLeaveRequestModel, type IHrLeaveType } from './leave.model';
import { leaveSettingsService } from './leave.settings';
import {
  availableOf,
  carryOf,
  closingOf,
  grantedIn,
  leaveYearOf,
  leaveYearRange,
  roundDays,
  type LeaveYearFigures,
} from './leave.rules';

interface RequestDays {
  leave_type_id: Types.ObjectId;
  status: 'PENDING' | 'APPROVED';
  day_breakdown: { date: string; days: number }[];
}

interface Adjustment {
  leave_type_id: Types.ObjectId;
  leave_year: number;
  days: number;
}

/** What one employee's leave records add up to, loaded once and summed per type and year. */
export interface LeaveLedger {
  startMonth: number;
  trackingStartYear: number;
  joining: string;
  requests: RequestDays[];
  adjustments: Adjustment[];
}

export interface TypeBalance {
  leave_type_id: string;
  year: number;
  figures: LeaveYearFigures;
  /** Null for unpaid leave, which has no balance to run out of. */
  available: number | null;
}

/** Load the records a balance needs: everything since the first tracked year, live requests only. */
export async function loadLedger(employee: Pick<IHrEmployee, '_id' | 'job'>, upToYear: number): Promise<LeaveLedger> {
  const settings = await leaveSettingsService.get();
  const startMonth = settings.leave_year_start_month;
  const from = leaveYearRange(Math.min(settings.tracking_start_year, upToYear), startMonth).from;
  const to = leaveYearRange(upToYear, startMonth).to;
  const [requests, adjustments] = await Promise.all([
    HrLeaveRequestModel.find({
      employee_id: employee._id,
      status: { $in: ['PENDING', 'APPROVED'] },
      end_date: { $gte: from },
      start_date: { $lte: to },
    })
      .select('leave_type_id status day_breakdown')
      .lean<RequestDays[]>(),
    HrLeaveAdjustmentModel.find({ employee_id: employee._id, leave_year: { $lte: upToYear } })
      .select('leave_type_id leave_year days')
      .lean<Adjustment[]>(),
  ]);
  return { startMonth, trackingStartYear: settings.tracking_start_year, joining: employee.job.date_of_joining, requests, adjustments };
}

/** Taken and pending days of one type inside one leave year, counted date by date. */
function usedIn(ledger: LeaveLedger, typeId: string, year: number) {
  const { from, to } = leaveYearRange(year, ledger.startMonth);
  let taken = 0;
  let pending = 0;
  for (const request of ledger.requests) {
    if (String(request.leave_type_id) !== typeId) continue;
    for (const day of request.day_breakdown) {
      if (day.date < from || day.date > to) continue;
      if (request.status === 'APPROVED') taken += day.days;
      else pending += day.days;
    }
  }
  return { taken: roundDays(taken), pending: roundDays(pending) };
}

const adjustedIn = (ledger: LeaveLedger, typeId: string, year: number) =>
  roundDays(ledger.adjustments.filter((a) => String(a.leave_type_id) === typeId && a.leave_year === year).reduce((s, a) => s + a.days, 0));

/**
 * One type's figures for a leave year, `asOf` a day. Earlier years are summed
 * as closed (everything granted) so their closing balance can carry forward;
 * nothing carries in from before the first tracked year.
 */
export function figuresFor(type: Pick<IHrLeaveType, '_id' | 'annual_quota' | 'accrual' | 'carry_forward_max'>, ledger: LeaveLedger, year: number, asOf: string): LeaveYearFigures {
  const typeId = String(type._id);
  let carried = 0;
  for (let y = ledger.trackingStartYear; y < year; y += 1) {
    const yearEnd = leaveYearRange(y, ledger.startMonth).to;
    const past: LeaveYearFigures = {
      granted: grantedIn(type, y, ledger.startMonth, ledger.joining, yearEnd),
      carried,
      adjusted: adjustedIn(ledger, typeId, y),
      ...usedIn(ledger, typeId, y),
    };
    carried = carryOf(closingOf(past), type.carry_forward_max);
  }
  return {
    granted: grantedIn(type, year, ledger.startMonth, ledger.joining, asOf),
    carried,
    adjusted: adjustedIn(ledger, typeId, year),
    ...usedIn(ledger, typeId, year),
  };
}

/** Every listed type's balance for the leave year containing `asOf` (today unless given). */
export async function balancesFor(
  employee: Pick<IHrEmployee, '_id' | 'job'>,
  types: IHrLeaveType[],
  year?: number
): Promise<TypeBalance[]> {
  const settings = await leaveSettingsService.get();
  const today = todayKey();
  const target = year ?? leaveYearOf(today, settings.leave_year_start_month);
  const ledger = await loadLedger(employee, target);
  const yearEnd = leaveYearRange(target, settings.leave_year_start_month).to;
  const asOf = today < yearEnd ? today : yearEnd;
  return types.map((type) => {
    const figures = figuresFor(type, ledger, target, asOf);
    return { leave_type_id: String(type._id), year: target, figures, available: type.paid ? availableOf(figures) : null };
  });
}

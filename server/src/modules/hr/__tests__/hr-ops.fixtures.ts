/**
 * Shared setup for the payroll, leave, bank-change and calendar suites: real
 * accounts, hires made through the HR console's own mutation, and dates picked
 * relative to today so a suite never lands inside a backdate or lead window by
 * the calendar alone.
 */
import { makeContext } from '@test/harness';
import { todayKey } from '@modules/hr/employee/employee.events';
import { hire, PERSONAL, person, type Ctx } from '@modules/hr/employee/__tests__/hr.fixtures';
import { addDays, weekdayOf } from '@modules/hr/leave/leave.rules';
import { hrLeaveResolvers } from '@modules/hr/leave/leave.resolver';

export const LQ = hrLeaveResolvers.Query as Record<string, (...a: any[]) => any>;
export const LM = hrLeaveResolvers.Mutation as Record<string, (...a: any[]) => any>;

export function idOf(ctx: Ctx): string {
  const id = ctx.user?.id;
  if (!id) throw new Error('This context is signed out');
  return id;
}

/** The same account, signed in with other roles (a role grant does not reach a context already made). */
export const asRoles = (ctx: Ctx, roles: string[]) => makeContext({ id: idOf(ctx), email: ctx.user?.email ?? undefined, roles });

/** The first Monday at least `days` from today. */
export function mondayAfter(days: number): string {
  const start = addDays(todayKey(), days);
  return addDays(start, (8 - weekdayOf(start)) % 7);
}

/** A Monday at least `days` ahead that falls on or before the 20th, so its week stays inside one calendar month. */
export function earlyMonday(days = 14): string {
  let monday = mondayAfter(days);
  while (Number(monday.slice(8, 10)) > 20) monday = addDays(monday, 7);
  return monday;
}

/** A leave year that starts this month, so today and every date a suite picks share one leave year. */
export const LEAVE_SETTINGS = { weekly_off_days: [0, 6], leave_year_start_month: Number(todayKey().slice(5, 7)), backdate_days: 7 };

export const BANK = {
  account_holder_name: 'Meera Nair',
  account_number: '123456789012',
  ifsc: 'HDFC0001234',
  bank_name: 'HDFC Bank',
  uan: '100000000001',
};

/** Hire `first` and return their HR record id, account id and an Employee-console context. */
export async function employee(hr: Ctx, first: string, over: Record<string, unknown> = {}) {
  const account = await person(first, ['USER']);
  const profile = await hire(hr, account, { personal: { ...PERSONAL, first_name: first }, ...over });
  return { id: profile.employee.id as string, userId: idOf(account), ctx: asRoles(account, ['EMPLOYEE']) };
}

export const CASUAL = {
  name: 'Casual leave',
  code: 'CL',
  paid: true,
  annual_quota: 12,
  accrual: 'YEARLY',
  carry_forward_max: 0,
  allow_half_day: true,
  active: true,
};

export const UNPAID = { ...CASUAL, name: 'Unpaid leave', code: 'LOP', paid: false, annual_quota: 0 };

export const leaveType = (hr: Ctx, input: Record<string, unknown> = CASUAL) => LM.saveHrLeaveType({}, { input }, hr);

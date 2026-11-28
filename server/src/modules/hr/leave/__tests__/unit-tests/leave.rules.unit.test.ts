import {
  addDays,
  availableOf,
  calendarDays,
  carryOf,
  closingOf,
  eachDay,
  grantedIn,
  holidaySchema,
  isWorkingDay,
  lastDayOf,
  leaveAdjustmentSchema,
  leaveDecisionSchema,
  leaveRequestSchema,
  leaveSettingsSchema,
  leaveTypeSchema,
  leaveYearMonths,
  leaveYearOf,
  leaveYearRange,
  partsFor,
  requestDays,
  totalDays,
  weekdayOf,
} from '../../leave.rules';

// December 2026: the 21st is a Monday, the 25th (a holiday here) a Friday, the 26th-27th a weekend.
const RULES = { weeklyOffs: new Set([0, 6]), holidays: new Set(['2026-12-25']) };

describe('day keys', () => {
  it('moves across month, year and leap-day boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('not-a-date', 3)).toBe('not-a-date');
  });

  it('names the weekday, and -1 for a key that is not a date', () => {
    expect(weekdayOf('2026-11-28')).toBe(6);
    expect(weekdayOf('2026-11-30')).toBe(1);
    expect(weekdayOf('2026-02-30')).toBe(-1);
  });

  it('walks every day inclusive, and nothing when the range is backwards', () => {
    expect(eachDay('2026-01-30', '2026-02-02')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
    expect(eachDay('2026-02-02', '2026-01-30')).toEqual([]);
    expect(calendarDays('2026-01-01', '2026-01-31')).toBe(31);
  });

  it('finds the last day of a month, February in a leap year included', () => {
    expect(lastDayOf('2026-02')).toBe('2026-02-28');
    expect(lastDayOf('2028-02')).toBe('2028-02-29');
    expect(lastDayOf('2026-12')).toBe('2026-12-31');
  });
});

describe('what a request costs', () => {
  it('counts working days only, leaving out weekly offs and holidays', () => {
    const days = requestDays('2026-12-21', '2026-12-28', null, RULES);
    expect([...days.keys()]).toEqual(['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-28']);
    expect(totalDays(days)).toBe(5);
    expect(isWorkingDay('2026-12-25', RULES)).toBe(false);
    expect(isWorkingDay('2026-12-26', RULES)).toBe(false);
  });

  it('charges half a day for a half-day request', () => {
    expect([...requestDays('2026-12-22', '2026-12-22', 'FIRST_HALF', RULES)]).toEqual([['2026-12-22', 0.5]]);
  });

  it('costs nothing when every date is off', () => {
    expect(requestDays('2026-12-25', '2026-12-27', null, RULES).size).toBe(0);
  });

  it('claims the morning, the afternoon, or both', () => {
    expect(partsFor(null)).toEqual(['AM', 'PM']);
    expect(partsFor('FIRST_HALF')).toEqual(['AM']);
    expect(partsFor('SECOND_HALF')).toEqual(['PM']);
  });
});

describe('leave years', () => {
  it('places a date in the year its leave year starts in', () => {
    expect(leaveYearOf('2027-03-31', 4)).toBe(2026);
    expect(leaveYearOf('2026-04-01', 4)).toBe(2026);
    expect(leaveYearOf('2026-12-01', 1)).toBe(2026);
  });

  it('spans April to March, or January to December', () => {
    expect(leaveYearRange(2026, 4)).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(leaveYearRange(2026, 1)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    const months = leaveYearMonths(2026, 11);
    expect(months).toHaveLength(12);
    expect([months[0], months[2], months[11]]).toEqual(['2026-11', '2027-01', '2027-10']);
  });
});

describe('what a type grants', () => {
  const yearly = { annual_quota: 12, accrual: 'YEARLY' as const };
  const monthly = { annual_quota: 15, accrual: 'MONTHLY' as const };

  it('grants a whole yearly quota on the first day to someone already employed', () => {
    expect(grantedIn(yearly, 2026, 1, '2025-06-10', '2026-01-01')).toBe(12);
  });

  it('grants a mid-year joiner the share of months left, from the joining day only', () => {
    expect(grantedIn(yearly, 2026, 1, '2026-07-15', '2026-08-01')).toBe(6);
    expect(grantedIn(yearly, 2026, 1, '2026-07-15', '2026-07-01')).toBe(0);
  });

  it('grants nothing for a year that has not started', () => {
    expect(grantedIn(yearly, 2027, 1, '2025-06-10', '2026-12-31')).toBe(0);
  });

  it('grants a monthly quota a twelfth at a time, joining month included', () => {
    expect(grantedIn(monthly, 2026, 1, '2025-01-01', '2026-03-10')).toBe(3.75);
    expect(grantedIn(monthly, 2026, 1, '2026-02-20', '2026-04-01')).toBe(3.75);
    expect(grantedIn({ annual_quota: 12, accrual: 'MONTHLY' }, 2025, 1, '2024-01-01', '2025-12-31')).toBe(12);
  });
});

describe('balances', () => {
  const f = { granted: 10, carried: 2, adjusted: -1, taken: 3, pending: 1.5 };

  it('keeps pending days out of what is left but not out of the closing balance', () => {
    expect(availableOf(f)).toBe(6.5);
    expect(closingOf(f)).toBe(8);
  });

  it('carries forward up to the cap and never a negative balance', () => {
    expect(carryOf(8, 5)).toBe(5);
    expect(carryOf(3.5, 5)).toBe(3.5);
    expect(carryOf(-2, 5)).toBe(0);
  });
});

describe('inputs', () => {
  const request = { leave_type_id: 'x', start_date: '2026-12-21', end_date: '2026-12-22' };

  it('accepts a plain request and fills the optional fields', () => {
    expect(leaveRequestSchema.parse({ ...request, reason: '  ' })).toEqual({ ...request, half_day: null, reason: null, client_request_id: null });
  });

  it('refuses a half day over two dates, a backwards range and a span over 92 days', () => {
    const half = leaveRequestSchema.safeParse({ ...request, half_day: 'FIRST_HALF' });
    expect(half.success).toBe(false);
    expect(half.error?.issues[0]).toMatchObject({ path: ['half_day'], message: 'A half day must start and end on the same date' });
    expect(leaveRequestSchema.safeParse({ ...request, end_date: '2026-12-20' }).success).toBe(false);
    expect(leaveRequestSchema.safeParse({ ...request, end_date: '2027-04-30' }).error?.issues[0]?.message).toBe('One request can cover at most 92 days');
  });

  it('needs a reason to decline, not to approve', () => {
    expect(leaveDecisionSchema.safeParse({ approve: false, note: '' }).success).toBe(false);
    expect(leaveDecisionSchema.safeParse({ approve: true }).success).toBe(true);
  });

  it('adjusts by non-zero half days only', () => {
    const base = { employee_id: 'e', leave_type_id: 't', leave_year: 2026, note: 'Opening balance' };
    expect(leaveAdjustmentSchema.safeParse({ ...base, days: 0 }).success).toBe(false);
    expect(leaveAdjustmentSchema.safeParse({ ...base, days: 0.25 }).success).toBe(false);
    expect(leaveAdjustmentSchema.parse({ ...base, days: -2.5 }).days).toBe(-2.5);
  });

  it('keeps at least one working day a week and tidies the weekly offs', () => {
    const base = { leave_year_start_month: 4, backdate_days: 7 };
    expect(leaveSettingsSchema.safeParse({ ...base, weekly_off_days: [0, 1, 2, 3, 4, 5, 6] }).success).toBe(false);
    expect(leaveSettingsSchema.parse({ ...base, weekly_off_days: [6, 0, 6] }).weekly_off_days).toEqual([0, 6]);
  });

  it('upper-cases a leave code and keeps quotas in half days', () => {
    const type = { name: 'Casual', code: 'cl', paid: true, annual_quota: 12, accrual: 'YEARLY', carry_forward_max: 0, allow_half_day: true, active: true };
    expect(leaveTypeSchema.parse(type).code).toBe('CL');
    expect(leaveTypeSchema.safeParse({ ...type, annual_quota: 1.25 }).success).toBe(false);
    expect(holidaySchema.safeParse({ date: '2026-13-01', name: 'Nope' }).success).toBe(false);
  });
});

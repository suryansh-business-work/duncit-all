/**
 * The HR payroll, leave and salary-account forms — one contract for the HR,
 * Finance and Employee consoles, matching the server's re-checks.
 */
import { describe, expect, it } from 'vitest';

import {
  bankChangeDefaults,
  leaveRequestDefaults,
  leaveSpanDays,
  leaveTypeDefaults,
  makeBankChangeSchema,
  makeHolidaySchema,
  makeHrNoteSchema,
  makeLeaveAdjustmentSchema,
  makeLeaveRequestSchema,
  makeLeaveSettingsSchema,
  makeLeaveTypeSchema,
  makePayrollAdjustmentSchema,
  makePayrollMonthSchema,
  makePayrollReleaseSchema,
  makePayrollSettingsSchema,
  toBankChangeInput,
  toLeaveRequestInput,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key;

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}:${issue.message}`);

describe('leave requests', () => {
  const schema = makeLeaveRequestSchema(t);
  const request = { ...leaveRequestDefaults, leave_type_id: 'cl', start_date: '2026-12-14', end_date: '2026-12-16' };

  it('accepts a plain request and sends blanks to the API as null', () => {
    expect(schema.safeParse(request).success).toBe(true);
    expect(toLeaveRequestInput({ ...request, reason: '  ' }, 'press-0001')).toEqual({
      leave_type_id: 'cl',
      start_date: '2026-12-14',
      end_date: '2026-12-16',
      half_day: null,
      reason: null,
      client_request_id: 'press-0001',
    });
  });

  it('names the field for a missing type, a backwards range, a half day over two dates and a span over 92 days', () => {
    expect(messages(schema.safeParse({ ...request, leave_type_id: '' }))).toEqual(['leave_type_id:hrShared.form.leaveTypeRequired']);
    expect(messages(schema.safeParse({ ...request, end_date: '2026-12-13' }))).toEqual(['end_date:hrShared.form.endBeforeStart']);
    expect(messages(schema.safeParse({ ...request, half_day: 'FIRST_HALF' }))).toEqual(['half_day:hrShared.form.halfDaySameDate']);
    expect(messages(schema.safeParse({ ...request, end_date: '2027-03-31' }))).toEqual(['end_date:hrShared.form.spanMax:92']);
  });

  it('keeps a chosen half day and a written reason on the way to the API', () => {
    const half = { ...request, end_date: request.start_date, half_day: 'SECOND_HALF' as const, reason: ' Clinic visit ' };
    expect(toLeaveRequestInput(half, 'press-0003')).toMatchObject({ half_day: 'SECOND_HALF', reason: 'Clinic visit' });
  });

  it('flags a date that is not on the calendar', () => {
    expect(messages(schema.safeParse({ ...request, start_date: '2026-02-30' }))).toContain('start_date:hrShared.form.dateInvalid');
  });

  it('counts the span in calendar days, inclusive', () => {
    expect(leaveSpanDays('2026-12-14', '2026-12-14')).toBe(1);
    expect(leaveSpanDays('2026-02-27', '2026-03-02')).toBe(4);
    expect(leaveSpanDays('nope', '2026-03-02')).toBe(0);
  });
});

describe('notes, types, settings and adjustments', () => {
  it('needs three characters only when the note is required', () => {
    expect(makeHrNoteSchema(t, false).safeParse({ note: '' }).success).toBe(true);
    expect(messages(makeHrNoteSchema(t, true).safeParse({ note: 'no' }))).toEqual(['note:hrShared.form.noteRequired']);
    expect(messages(makeHrNoteSchema(t, false, 5).safeParse({ note: 'too long' }))).toEqual(['note:hrShared.form.tooLong:5']);
  });

  it('upper-cases a leave code and keeps days in halves', () => {
    const schema = makeLeaveTypeSchema(t);
    expect(schema.parse({ ...leaveTypeDefaults, name: 'Casual', code: 'cl' }).code).toBe('CL');
    expect(messages(schema.safeParse({ ...leaveTypeDefaults, name: 'Casual', code: '1X' }))).toEqual(['code:hrShared.form.codeInvalid']);
    expect(messages(schema.safeParse({ ...leaveTypeDefaults, name: 'Casual', code: 'CL', annual_quota: 1.25 }))).toEqual(['annual_quota:hrShared.form.halfSteps']);
  });

  it('takes a holiday on a real date with a name', () => {
    const schema = makeHolidaySchema(t);
    expect(schema.parse({ date: '2026-12-25', name: ' Christmas ' })).toEqual({ date: '2026-12-25', name: 'Christmas' });
    expect(messages(schema.safeParse({ date: '2026-02-30', name: '' }))).toEqual(['date:hrShared.form.dateInvalid', 'name:hrShared.form.required']);
    expect(messages(schema.safeParse({ date: '2026-12-25', name: 'x'.repeat(81) }))).toEqual(['name:hrShared.form.tooLong:80']);
  });

  it('keeps one working day a week and the backdate inside its bounds', () => {
    const schema = makeLeaveSettingsSchema(t);
    expect(messages(schema.safeParse({ weekly_off_days: [0, 1, 2, 3, 4, 5, 6], leave_year_start_month: 4, backdate_days: 7 }))).toEqual([
      'weekly_off_days:hrShared.form.weeklyOffsMax',
    ]);
    expect(messages(schema.safeParse({ weekly_off_days: [0], leave_year_start_month: 4, backdate_days: 91 }))).toEqual(['backdate_days:hrShared.form.backdateRange:90']);
  });

  it('adjusts by a non-zero number of half days with a reason', () => {
    const schema = makeLeaveAdjustmentSchema(t);
    const base = { leave_type_id: 'cl', note: 'Opening balance' };
    expect(schema.safeParse({ ...base, days: -1.5 }).success).toBe(true);
    expect(messages(schema.safeParse({ ...base, days: 0 }))).toEqual(['days:hrShared.form.adjustNonZero']);
    expect(messages(schema.safeParse({ ...base, days: 0.3 }))).toEqual(['days:hrShared.form.halfSteps']);
  });
});

describe('salary account changes', () => {
  const schema = makeBankChangeSchema(t);
  const change = {
    ...bankChangeDefaults,
    account_holder_name: 'Meera Nair',
    account_number: '987654321098',
    account_number_confirm: '987654321098',
    ifsc: 'icic0004321',
    proof_url: 'https://ik.imagekit.io/x/cheque.jpg',
  };

  it('accepts a complete change and upper-cases the IFSC on the way out', () => {
    expect(schema.safeParse(change).success).toBe(true);
    expect(toBankChangeInput(change, 'press-0002')).toMatchObject({ ifsc: 'ICIC0004321', bank_name: null, note: null, client_request_id: 'press-0002' });
    expect(toBankChangeInput({ ...change, bank_name: ' ICICI Bank ', note: ' Moved banks ' }, 'press-0004')).toMatchObject({ bank_name: 'ICICI Bank', note: 'Moved banks' });
  });

  it('refuses a mistyped second account number, a bad IFSC and a missing proof', () => {
    expect(messages(schema.safeParse({ ...change, account_number_confirm: '987654321099' }))).toEqual(['account_number_confirm:hrShared.form.accountsMismatch']);
    expect(messages(schema.safeParse({ ...change, ifsc: 'ICIC04321' }))).toEqual(['ifsc:hrShared.form.ifscInvalid']);
    expect(messages(schema.safeParse({ ...change, proof_url: '' }))).toEqual(['proof_url:hrShared.form.proofRequired']);
    expect(messages(schema.safeParse({ ...change, account_number: '12345', account_number_confirm: '12345' }))).toEqual([
      'account_number:hrShared.form.accountNumberInvalid',
    ]);
  });
});

describe('payroll', () => {
  it('takes adjustments above zero with at most two decimals', () => {
    const schema = makePayrollAdjustmentSchema(t);
    expect(schema.safeParse({ label: 'Bonus', type: 'EARNING', amount: 2500.5, note: '' }).success).toBe(true);
    expect(messages(schema.safeParse({ label: 'Bonus', type: 'EARNING', amount: 10.005, note: '' }))).toEqual(['amount:hrShared.form.twoDecimals']);
    expect(messages(schema.safeParse({ label: '', type: 'DEDUCTION', amount: 0, note: '' }))).toEqual(['label:hrShared.form.required', 'amount:hrShared.form.amountPositive']);
  });

  it('releases for today up to 60 days ahead, never before', () => {
    const schema = makePayrollReleaseSchema(t, '2026-11-28');
    expect(schema.safeParse({ pay_on: '2026-11-28', note: '' }).success).toBe(true);
    expect(schema.safeParse({ pay_on: '2027-01-27', note: '' }).success).toBe(true);
    expect(messages(schema.safeParse({ pay_on: '2026-11-27', note: '' }))).toEqual(['pay_on:hrShared.form.payOnPast']);
    expect(messages(schema.safeParse({ pay_on: '2027-01-28', note: '' }))).toEqual(['pay_on:hrShared.form.payOnTooFar:60']);
    expect(messages(schema.safeParse({ pay_on: '2026-02-30', note: '' }))).toEqual(['pay_on:hrShared.form.dateInvalid', 'pay_on:hrShared.form.payOnPast']);
  });

  it('only checks the past when it cannot read today', () => {
    expect(messages(makePayrollReleaseSchema(t, 'not-a-day').safeParse({ pay_on: '2026-11-28', note: '' }))).toEqual(['pay_on:hrShared.form.payOnPast']);
  });

  it('bounds the pay day and the drafting lead, and wants a real month', () => {
    const schema = makePayrollSettingsSchema(t);
    const settings = { scheduler_enabled: true, pay_timing: 'SAME_MONTH', pay_day: 31, draft_lead_days: 5, payout_mode: 'IMPS' };
    expect(schema.safeParse(settings).success).toBe(true);
    expect(messages(schema.safeParse({ ...settings, pay_day: 0, draft_lead_days: 21 }))).toEqual([
      'pay_day:hrShared.form.payDayRange:1|31',
      'draft_lead_days:hrShared.form.leadDaysRange:1|20',
    ]);
    expect(makePayrollMonthSchema(t).safeParse({ month: '2026-11' }).success).toBe(true);
    expect(messages(makePayrollMonthSchema(t).safeParse({ month: '2026-13' }))).toEqual(['month:hrShared.form.monthRequired']);
  });
});

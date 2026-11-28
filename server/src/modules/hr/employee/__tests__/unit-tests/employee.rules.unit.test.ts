import {
  compensationSchema,
  compensationTotals,
  effectiveOn,
  exitSchema,
  exitStatusFor,
  formatEmployeeCode,
  hireSchema,
  jobSchema,
  lastFour,
  maskedTail,
  toPaise,
  toRupees,
  yearsBetween,
  canCancelExit,
  canRehire,
  canScheduleExit,
  isEditable,
} from '../../employee.rules';
import { cleanList, hrSettingsSchema } from '@modules/hr/settings/hrSettings.rules';

const job = {
  job_title: 'Analyst',
  employment_type: 'FULL_TIME',
  date_of_joining: '2026-03-01',
  notice_period_days: 30,
};

describe('money', () => {
  it('rounds rupees to whole paise and back without float drift', () => {
    // 1234.56 * 100 is 123455.99999999999 in floating point; it must still be 123456 paise.
    expect(toPaise(1234.56)).toBe(123456);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toRupees(123457)).toBe(1234.57);
  });
});

describe('compensationTotals', () => {
  it('splits fixed and target-linked earnings, and counts employer cost into the CTC', () => {
    const totals = compensationTotals([
      { label: 'Basic', type: 'EARNING', monthly_paise: 4_000_000, target_linked: false },
      { label: 'Incentive', type: 'EARNING', monthly_paise: 1_000_000, target_linked: true },
      { label: 'PF', type: 'DEDUCTION', monthly_paise: 180_000, target_linked: false },
      { label: 'Employer PF', type: 'EMPLOYER_CONTRIBUTION', monthly_paise: 180_000, target_linked: false },
    ]);
    expect(totals).toEqual({
      gross_monthly_paise: 5_000_000,
      fixed_gross_monthly_paise: 4_000_000,
      variable_monthly_paise: 1_000_000,
      deductions_monthly_paise: 180_000,
      employer_monthly_paise: 180_000,
      net_monthly_paise: 4_820_000,
      annual_ctc_paise: 62_160_000,
    });
  });

  it('is all zero for no lines and never counts a negative amount', () => {
    expect(compensationTotals([]).annual_ctc_paise).toBe(0);
    expect(compensationTotals([{ label: 'x', type: 'EARNING', monthly_paise: -500, target_linked: false }]).gross_monthly_paise).toBe(0);
  });
});

describe('effectiveOn', () => {
  const revisions = [{ effective_from: '2026-01-01' }, { effective_from: '2026-06-01' }, { effective_from: '2026-12-01' }];

  it('picks the newest revision that has started', () => {
    expect(effectiveOn(revisions, '2026-06-01')).toBe(revisions[1]);
    expect(effectiveOn(revisions, '2026-11-30')).toBe(revisions[1]);
    expect(effectiveOn(revisions, '2027-01-01')).toBe(revisions[2]);
  });

  it('is null before the first revision', () => {
    expect(effectiveOn(revisions, '2025-12-31')).toBeNull();
    expect(effectiveOn([], '2026-01-01')).toBeNull();
  });
});

describe('codes, masking and ages', () => {
  it('formats the code with an uppercase prefix and zero padding', () => {
    expect(formatEmployeeCode(' dun ', 7, 4)).toBe('DUN-0007');
    expect(formatEmployeeCode('', 12, 3)).toBe('012');
    expect(formatEmployeeCode('E', 12345, 3)).toBe('E-12345');
  });

  it('keeps the last four characters and masks the rest', () => {
    expect(lastFour('123456789012')).toBe('9012');
    expect(maskedTail('9012')).toBe('•••• 9012');
  });

  it('counts whole years the way a birthday does', () => {
    expect(yearsBetween('2000-06-15', '2026-06-14')).toBe(25);
    expect(yearsBetween('2000-06-15', '2026-06-15')).toBe(26);
    expect(yearsBetween('2000-02-29', '2026-02-28')).toBe(25);
    expect(yearsBetween('not-a-date', '2026-01-01')).toBe(0);
  });
});

describe('status transitions', () => {
  it('exits now for a past last day and serves notice otherwise', () => {
    expect(exitStatusFor('2026-11-27', '2026-11-28')).toBe('EXITED');
    expect(exitStatusFor('2026-11-28', '2026-11-28')).toBe('ON_NOTICE');
    expect(exitStatusFor('2026-12-31', '2026-11-28')).toBe('ON_NOTICE');
  });

  it('allows each action only from the states it belongs to', () => {
    expect([canScheduleExit('ACTIVE'), canScheduleExit('ON_NOTICE'), canScheduleExit('EXITED')]).toEqual([true, true, false]);
    expect([canCancelExit('ACTIVE'), canCancelExit('ON_NOTICE'), canCancelExit('EXITED')]).toEqual([false, true, false]);
    expect([canRehire('ACTIVE'), canRehire('ON_NOTICE'), canRehire('EXITED')]).toEqual([false, false, true]);
    expect([isEditable('ACTIVE'), isEditable('ON_NOTICE'), isEditable('EXITED')]).toEqual([true, true, false]);
  });
});

describe('input schemas', () => {
  it('requires exactly one of an existing account or a new one', () => {
    const base = { personal: { first_name: 'A', last_name: 'B' }, job };
    expect(hireSchema.safeParse({ ...base, account_user_id: 'u1' }).success).toBe(true);
    expect(hireSchema.safeParse({ ...base, new_account: { email: 'a@b.co' } }).success).toBe(true);
    expect(hireSchema.safeParse(base).success).toBe(false);
    expect(hireSchema.safeParse({ ...base, account_user_id: 'u1', new_account: { email: 'a@b.co' } }).success).toBe(false);
  });

  it('normalises blanks to null and refuses bad dates, emails and codes', () => {
    const parsed = jobSchema.parse({ ...job, department: '  ', work_email: '', probation_end_date: '' });
    expect(parsed).toMatchObject({ department: null, work_email: null, probation_end_date: null, manager_id: null });
    expect(jobSchema.safeParse({ ...job, date_of_joining: '2026-02-30' }).success).toBe(false);
    expect(jobSchema.safeParse({ ...job, work_email: 'nope' }).success).toBe(false);
    expect(jobSchema.safeParse({ ...job, notice_period_days: 1.5 }).success).toBe(false);
    expect(hireSchema.safeParse({ personal: { first_name: 'A', last_name: 'B' }, job, account_user_id: 'u', employee_code: 'a b' }).success).toBe(false);
  });

  it('needs an earning above zero and keeps target links to earnings', () => {
    const pay = { currency: 'inr', effective_from: '2026-03-01', reason: 'REVISION' };
    expect(compensationSchema.parse({ ...pay, components: [{ label: 'Basic', type: 'EARNING', monthly_amount: 1 }] }).currency).toBe('INR');
    expect(compensationSchema.safeParse({ ...pay, components: [{ label: 'PF', type: 'DEDUCTION', monthly_amount: 1 }] }).success).toBe(false);
    expect(
      compensationSchema.safeParse({
        ...pay,
        components: [
          { label: 'Basic', type: 'EARNING', monthly_amount: 1 },
          { label: 'PF', type: 'DEDUCTION', monthly_amount: 1, target_linked: true },
        ],
      }).success
    ).toBe(false);
  });

  it('refuses a last working day before the resignation date', () => {
    const exit = { exit_type: 'RESIGNATION', last_working_day: '2026-12-01', eligible_for_rehire: true, expected_revision: 0 };
    expect(exitSchema.safeParse({ ...exit, resignation_date: '2026-11-01' }).success).toBe(true);
    expect(exitSchema.safeParse({ ...exit, resignation_date: '2026-12-02' }).success).toBe(false);
  });
});

describe('HR settings rules', () => {
  it('cleans lists: trimmed, no blanks, no case-insensitive repeats, order kept', () => {
    expect(cleanList([' Ops', 'growth', 'OPS', '', 'Growth ', 'Sales'])).toEqual(['Ops', 'growth', 'Sales']);
  });

  it('bounds the code prefix, digits and percents', () => {
    expect(hrSettingsSchema.safeParse({ employee_code_prefix: 'TOO-LONG-PREFIX' }).success).toBe(false);
    expect(hrSettingsSchema.safeParse({ employee_code_prefix: 'E-1' }).success).toBe(false);
    expect(hrSettingsSchema.safeParse({ employee_code_digits: 1 }).success).toBe(false);
    const line = { label: 'Basic', type: 'EARNING', calc: 'PERCENT_OF_CTC', value: 120 };
    expect(hrSettingsSchema.safeParse({ salary_template: [line] }).success).toBe(false);
    expect(hrSettingsSchema.safeParse({ salary_template: [{ ...line, value: 40 }] }).success).toBe(true);
  });

  it('keeps the balance and target links to earnings', () => {
    const basic = { label: 'Basic', type: 'EARNING', calc: 'FIXED', value: 10000 };
    expect(hrSettingsSchema.safeParse({ salary_template: [basic, { label: 'X', type: 'DEDUCTION', calc: 'BALANCE', value: 0 }] }).success).toBe(false);
    expect(
      hrSettingsSchema.safeParse({ salary_template: [basic, { label: 'X', type: 'DEDUCTION', calc: 'FIXED', value: 1, target_linked: true }] }).success
    ).toBe(false);
  });
});

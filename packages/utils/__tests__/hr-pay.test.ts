import { describe, expect, it } from 'vitest';
import {
  addMonthsToDayKey,
  applySalaryTemplate,
  currencySymbol,
  dateOfDayKey,
  dayKeyOf,
  formatCurrency,
  hrPayTotals,
  type HrTemplateLine,
} from '../src';

const line = (over: Partial<HrTemplateLine>): HrTemplateLine => ({
  label: 'Line',
  type: 'EARNING',
  calc: 'FIXED',
  value: 0,
  target_linked: false,
  ...over,
});

describe('hrPayTotals', () => {
  it('matches the server: target lines in gross at 100%, deductions off net, employer into CTC', () => {
    expect(
      hrPayTotals([
        { type: 'EARNING', monthly_amount: 40000, target_linked: false },
        { type: 'EARNING', monthly_amount: 10000, target_linked: true },
        { type: 'DEDUCTION', monthly_amount: 1800, target_linked: false },
        { type: 'EMPLOYER_CONTRIBUTION', monthly_amount: 1800, target_linked: false },
      ])
    ).toEqual({
      gross_monthly: 50000,
      fixed_gross_monthly: 40000,
      variable_monthly: 10000,
      deductions_monthly: 1800,
      employer_monthly: 1800,
      net_monthly: 48200,
      annual_ctc: 621600,
    });
  });

  it('adds paise exactly and ignores negative or non-numeric amounts', () => {
    const totals = hrPayTotals([
      { type: 'EARNING', monthly_amount: 0.1, target_linked: false },
      { type: 'EARNING', monthly_amount: 0.2, target_linked: false },
      { type: 'EARNING', monthly_amount: -50, target_linked: false },
      { type: 'EARNING', monthly_amount: Number.NaN, target_linked: false },
    ]);
    expect(totals.gross_monthly).toBe(0.3);
    expect(hrPayTotals([]).annual_ctc).toBe(0);
  });
});

describe('applySalaryTemplate', () => {
  const template = [
    line({ label: 'Basic', calc: 'PERCENT_OF_CTC', value: 40 }),
    line({ label: 'HRA', calc: 'PERCENT_OF_BASIC', value: 50 }),
    line({ label: 'Employer PF', type: 'EMPLOYER_CONTRIBUTION', calc: 'FIXED', value: 1800 }),
    line({ label: 'Employee PF', type: 'DEDUCTION', calc: 'FIXED', value: 1800 }),
    line({ label: 'Special allowance', calc: 'BALANCE' }),
  ];

  it('splits a 12 lakh CTC so earnings and employer cost add back up to the monthly CTC', () => {
    const lines = applySalaryTemplate(1_200_000, template);
    expect(lines.map((l) => [l.label, l.monthly_amount])).toEqual([
      ['Basic', 40000],
      ['HRA', 20000],
      ['Employer PF', 1800],
      ['Employee PF', 1800],
      ['Special allowance', 38200],
    ]);
    expect(hrPayTotals(lines).annual_ctc).toBe(1_200_000);
  });

  it('never makes the balance negative when the template overshoots the CTC', () => {
    const lines = applySalaryTemplate(120_000, [line({ label: 'Basic', calc: 'FIXED', value: 20000 }), line({ label: 'Rest', calc: 'BALANCE' })]);
    expect(lines[1].monthly_amount).toBe(0);
  });

  it('carries the target link and returns nothing for an empty template', () => {
    const lines = applySalaryTemplate(600_000, [line({ label: 'Basic', calc: 'PERCENT_OF_CTC', value: 80 }), line({ label: 'Incentive', calc: 'PERCENT_OF_CTC', value: 20, target_linked: true })]);
    expect(lines[1]).toEqual({ label: 'Incentive', type: 'EARNING', monthly_amount: 10000, target_linked: true });
    expect(applySalaryTemplate(600_000, [])).toEqual([]);
  });
});

describe('currency', () => {
  it('uses the ISO code’s own symbol and falls back to the code itself', () => {
    expect(currencySymbol('INR')).toBe('₹');
    expect(currencySymbol('NOT')).toBe('NOT');
    expect(formatCurrency(125000, 'INR')).toBe('₹1,25,000');
    expect(formatCurrency(1234.5, 'INR', 2)).toBe('₹1,234.50');
  });
});

describe('day keys', () => {
  it('round-trips a calendar date and refuses impossible ones', () => {
    expect(dayKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateOfDayKey('2026-01-05')?.getDate()).toBe(5);
    expect(dateOfDayKey('2026-02-30')).toBeNull();
    expect(dateOfDayKey('05-01-2026')).toBeNull();
    expect(dateOfDayKey(null)).toBeNull();
  });

  it('adds months, clamping to the shorter month’s last day', () => {
    expect(addMonthsToDayKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDayKey('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsToDayKey('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonthsToDayKey('nope', 3)).toBeNull();
  });
});

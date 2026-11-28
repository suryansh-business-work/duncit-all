import {
  adjustmentSchema,
  blockingIssues,
  draftDateFor,
  earnMonth,
  employedWindow,
  isFixed,
  isPayable,
  isTargetLinked,
  issuesFor,
  lineTotals,
  monthsDueForDraft,
  payDateFor,
  releaseSchema,
  shiftMonth,
  variableFor,
} from '../../payroll.rules';

type Kind = 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
const line = (label: string, type: Kind, monthly_paise: number, target_linked = false) => ({ label, type, monthly_paise, target_linked });
const rev = (effective_from: string, components: ReturnType<typeof line>[]) => ({ effective_from, currency: 'INR', components });

const PAY = rev('2025-01-01', [
  line('Basic', 'EARNING', 3_000_000),
  line('Incentive', 'EARNING', 1_000_000, true),
  line('PF', 'DEDUCTION', 180_000),
  line('Employer PF', 'EMPLOYER_CONTRIBUTION', 180_000),
]);
const none = new Map<string, number>();
const amountOf = (lines: { label: string; amount_paise: number }[], label: string) => lines.find((l) => l.label === label)?.amount_paise;

describe('employment window', () => {
  it('is the whole month, from the joining day, or up to the last working day', () => {
    expect(employedWindow('2026-11', '2025-01-01', null)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(employedWindow('2026-11', '2026-11-16', null)).toEqual({ from: '2026-11-16', to: '2026-11-30' });
    expect(employedWindow('2026-11', '2025-01-01', '2026-11-10')).toEqual({ from: '2026-11-01', to: '2026-11-10' });
  });

  it('is empty for a month before joining or after leaving', () => {
    expect(employedWindow('2026-11', '2026-12-01', null)).toBeNull();
    expect(employedWindow('2026-11', '2025-01-01', '2026-10-31')).toBeNull();
  });
});

describe('a month of pay', () => {
  it('pays exactly the monthly figures for a full month and leaves target-linked pay out', () => {
    const earned = earnMonth('2026-11', employedWindow('2026-11', '2025-01-01', null), [PAY], none, isFixed);
    expect(earned).toMatchObject({ days_in_month: 30, payable_days: 30, lop_days: 0, covered_days: 30 });
    expect(earned.lines.map((l) => [l.label, l.amount_paise])).toEqual([
      ['Basic', 3_000_000],
      ['PF', 180_000],
      ['Employer PF', 180_000],
    ]);
  });

  it('pays a mid-month joiner for the days from joining', () => {
    const earned = earnMonth('2026-11', employedWindow('2026-11', '2026-11-16', null), [PAY], none, isFixed);
    expect(earned.payable_days).toBe(15);
    expect(amountOf(earned.lines, 'Basic')).toBe(1_500_000);
  });

  it('takes out a whole and a half day of unpaid leave', () => {
    const unpaid = new Map([['2026-11-10', 1], ['2026-11-11', 0.5]]);
    const earned = earnMonth('2026-11', employedWindow('2026-11', '2025-01-01', null), [PAY], unpaid, isFixed);
    expect(earned).toMatchObject({ payable_days: 28.5, lop_days: 1.5 });
    expect(amountOf(earned.lines, 'Basic')).toBe(2_850_000);
  });

  it('pays each day at the revision in force that day when pay changes mid-month', () => {
    const raise = rev('2026-11-16', [line('Basic', 'EARNING', 4_500_000)]);
    const earned = earnMonth('2026-11', employedWindow('2026-11', '2025-01-01', null), [rev('2025-01-01', [line('Basic', 'EARNING', 3_000_000)]), raise], none, isFixed);
    expect(amountOf(earned.lines, 'Basic')).toBe(3_750_000);
    expect(earned.lines[0]?.monthly_paise).toBe(4_500_000);
    expect(earned.last_revision).toBe(raise);
  });

  it('stops at the last working day', () => {
    const earned = earnMonth('2026-11', employedWindow('2026-11', '2025-01-01', '2026-11-10'), [PAY], none, isFixed);
    expect(amountOf(earned.lines, 'Basic')).toBe(1_000_000);
  });

  it('pays nothing when no revision is in force, and says so with zero covered days', () => {
    const later = rev('2026-12-01', [line('Basic', 'EARNING', 3_000_000)]);
    const earned = earnMonth('2026-11', employedWindow('2026-11', '2025-01-01', null), [later], none, isFixed);
    expect(earned).toMatchObject({ covered_days: 0, lines: [], last_revision: null });
    expect(earnMonth('2026-11', null, [PAY], none, isFixed).lines).toEqual([]);
  });

  it('rounds once per line to the nearest paisa', () => {
    const odd = rev('2025-01-01', [line('Basic', 'EARNING', 1_000_001)]);
    const earned = earnMonth('2026-12', employedWindow('2026-12', '2025-01-01', null), [odd], new Map([['2026-12-02', 1]]), isFixed);
    expect(amountOf(earned.lines, 'Basic')).toBe(967_743);
  });
});

describe('target-linked pay', () => {
  const earned = earnMonth('2026-10', employedWindow('2026-10', '2025-01-01', null), [PAY], none, isTargetLinked);

  it('pays the reviewed percentage of what the month earned', () => {
    expect(variableFor(earned, 80)).toEqual([{ label: 'Incentive', base_paise: 1_000_000, amount_paise: 800_000 }]);
  });

  it('never pays more than 100 percent or less than nothing', () => {
    expect(variableFor(earned, 150)[0]?.amount_paise).toBe(1_000_000);
    expect(variableFor(earned, -5)[0]?.amount_paise).toBe(0);
  });

  it('has nothing to pay for a month with no target-linked earning', () => {
    const plain = earnMonth('2026-10', employedWindow('2026-10', '2025-01-01', null), [rev('2025-01-01', [line('Basic', 'EARNING', 100)])], none, isTargetLinked);
    expect(variableFor(plain, 100)).toEqual([]);
  });
});

describe('totals and issues', () => {
  it('adds adjustments to the side they belong to', () => {
    const totals = lineTotals({
      earnings: [{ amount_paise: 100 }],
      variable: [{ amount_paise: 50 }],
      deductions: [{ amount_paise: 30 }],
      employer: [{ amount_paise: 20 }],
      adjustments: [
        { type: 'EARNING', amount_paise: 10 },
        { type: 'DEDUCTION', amount_paise: 200 },
      ],
    });
    expect(totals).toEqual({ gross_paise: 160, deductions_paise: 230, net_paise: -70, employer_paise: 20 });
  });

  it('lists every issue, and only the blocking ones stop a payout', () => {
    const all = issuesFor({ coveredDays: 0, currency: 'USD', hasBank: false, netPaise: -1, pendingLeave: true, unreviewedVariable: true });
    expect(all).toEqual(['NO_COMPENSATION', 'NO_BANK', 'NEGATIVE_NET', 'UNSUPPORTED_CURRENCY', 'PENDING_LEAVE', 'TARGET_NOT_REVIEWED']);
    expect(blockingIssues(all)).toEqual(['NO_COMPENSATION', 'NO_BANK', 'NEGATIVE_NET', 'UNSUPPORTED_CURRENCY']);
    expect(issuesFor({ coveredDays: 30, currency: 'INR', hasBank: true, netPaise: 5, pendingLeave: false, unreviewedVariable: false })).toEqual([]);
  });

  it('pays a line only when nothing blocks it, it is not held and there is money to send', () => {
    expect(isPayable({ hold: null, issues: ['PENDING_LEAVE'], net_paise: 1 })).toBe(true);
    expect(isPayable({ hold: { note: 'x' }, issues: [], net_paise: 1 })).toBe(false);
    expect(isPayable({ hold: null, issues: [], net_paise: 0 })).toBe(false);
    expect(isPayable({ hold: null, issues: ['NO_BANK'], net_paise: 1 })).toBe(false);
  });
});

describe('pay days and the drafting window', () => {
  it('clamps a pay day to the month and moves NEXT_MONTH a month on', () => {
    expect(payDateFor('2026-02', 'SAME_MONTH', 31)).toBe('2026-02-28');
    expect(payDateFor('2026-11', 'NEXT_MONTH', 5)).toBe('2026-12-05');
    expect(payDateFor('2026-12', 'NEXT_MONTH', 31)).toBe('2027-01-31');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('opens the window lead days before the pay day and closes it on the pay day', () => {
    const same = { pay_timing: 'SAME_MONTH' as const, pay_day: 30, draft_lead_days: 5 };
    expect(draftDateFor('2026-11', same)).toBe('2026-11-25');
    expect(monthsDueForDraft('2026-11-24', same)).toEqual([]);
    expect(monthsDueForDraft('2026-11-25', same)).toEqual(['2026-11']);
    expect(monthsDueForDraft('2026-11-30', same)).toEqual(['2026-11']);
    expect(monthsDueForDraft('2026-12-01', same)).toEqual([]);
  });

  it('drafts the month just closed when it is paid in the next one', () => {
    const next = { pay_timing: 'NEXT_MONTH' as const, pay_day: 3, draft_lead_days: 5 };
    expect(monthsDueForDraft('2026-11-28', next)).toEqual(['2026-11']);
    expect(monthsDueForDraft('2026-12-02', next)).toEqual(['2026-11']);
    expect(monthsDueForDraft('2026-12-04', next)).toEqual([]);
  });
});

describe('inputs', () => {
  it('takes adjustments above zero with at most two decimals', () => {
    const base = { label: 'Bonus', type: 'EARNING' };
    expect(adjustmentSchema.safeParse({ ...base, amount: 10.01 }).success).toBe(true);
    expect(adjustmentSchema.safeParse({ ...base, amount: 10.005 }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it('needs a real pay date to release', () => {
    expect(releaseSchema.safeParse({ pay_on: '2026-11-31' }).success).toBe(false);
    expect(releaseSchema.parse({ pay_on: '2026-11-30' })).toEqual({ pay_on: '2026-11-30', note: null });
  });
});

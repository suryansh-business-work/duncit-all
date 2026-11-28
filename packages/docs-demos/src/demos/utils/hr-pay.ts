import { addMonthsToDayKey, applySalaryTemplate, formatCurrency, hrPayTotals, type HrTemplateLine } from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface HrPayMock {
  /** Annual cost to company, in the currency's major unit. */
  annualCtc: number;
  currency: string;
  /** HR > Settings' salary template; the first line is the basic. */
  template: HrTemplateLine[];
  /** A joining date and the probation months HR settings suggest. */
  joining: string;
  probationMonths: number;
}

export const hrPayDemos: PackageDemo[] = [
  defineDemo<HrPayMock>({
    id: 'hr-salary-template',
    title: 'An annual CTC through the salary template, and what the lines add up to',
    note:
      'Change annualCtc or a template value and the lines and totals follow. BALANCE takes what is left of the monthly CTC after every other earning and employer contribution, so the lines add back up to the CTC; a deduction never reduces it. Mark a line target_linked and it moves into the target-linked share, paid in proportion to the reviewed monthly target.',
    mock: {
      annualCtc: 1200000,
      currency: 'INR',
      template: [
        { label: 'Basic', type: 'EARNING', calc: 'PERCENT_OF_CTC', value: 40, target_linked: false },
        { label: 'HRA', type: 'EARNING', calc: 'PERCENT_OF_BASIC', value: 50, target_linked: false },
        { label: 'Employer PF', type: 'EMPLOYER_CONTRIBUTION', calc: 'FIXED', value: 1800, target_linked: false },
        { label: 'Employee PF', type: 'DEDUCTION', calc: 'FIXED', value: 1800, target_linked: false },
        { label: 'Target incentive', type: 'EARNING', calc: 'PERCENT_OF_CTC', value: 10, target_linked: true },
        { label: 'Special allowance', type: 'EARNING', calc: 'BALANCE', value: 0, target_linked: false },
      ],
      joining: '2026-01-31',
      probationMonths: 1,
    },
    compute: (mock) => {
      const lines = applySalaryTemplate(mock.annualCtc, mock.template);
      const totals = hrPayTotals(lines);
      return {
        'Monthly lines': lines.map((line) => `${line.label}: ${formatCurrency(line.monthly_amount, mock.currency, 2)}`),
        Totals: {
          gross: formatCurrency(totals.gross_monthly, mock.currency, 2),
          net: formatCurrency(totals.net_monthly, mock.currency, 2),
          targetLinked: formatCurrency(totals.variable_monthly, mock.currency, 2),
          annualCtc: formatCurrency(totals.annual_ctc, mock.currency),
        },
        'Probation ends': addMonthsToDayKey(mock.joining, mock.probationMonths),
      };
    },
  }),
];

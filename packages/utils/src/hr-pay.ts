/**
 * Pay maths the HR console previews before it saves: the totals a set of pay
 * lines adds up to, and a salary template applied to an annual CTC. All sums
 * run in whole paise so a preview never drifts from the server's figures.
 *
 * TWIN: `hrPayTotals` mirrors `compensationTotals` in
 * server/src/modules/hr/employee/employee.rules.ts — the server derives the
 * stored totals itself and never trusts a client's; this is only the preview.
 */
import { formatMoney } from './format-money';
import type { HrCompensationTotalsRecord, HrPayLineRecord, HrTemplateLine } from './hr-records';

const toPaise = (rupees: number) => Math.round((Number.isFinite(rupees) ? rupees : 0) * 100);
const toRupees = (paise: number) => Math.round(paise) / 100;

/** What a set of pay lines adds up to — target-linked earnings counted at 100%. */
export function hrPayTotals(lines: readonly Pick<HrPayLineRecord, 'type' | 'monthly_amount' | 'target_linked'>[]): HrCompensationTotalsRecord {
  let fixed = 0;
  let variable = 0;
  let deductions = 0;
  let employer = 0;
  for (const line of lines) {
    const amount = Math.max(0, toPaise(line.monthly_amount));
    if (line.type === 'DEDUCTION') deductions += amount;
    else if (line.type === 'EMPLOYER_CONTRIBUTION') employer += amount;
    else if (line.target_linked) variable += amount;
    else fixed += amount;
  }
  const gross = fixed + variable;
  return {
    gross_monthly: toRupees(gross),
    fixed_gross_monthly: toRupees(fixed),
    variable_monthly: toRupees(variable),
    deductions_monthly: toRupees(deductions),
    employer_monthly: toRupees(employer),
    net_monthly: toRupees(gross - deductions),
    annual_ctc: toRupees((gross + employer) * 12),
  };
}

function linePaise(line: HrTemplateLine, monthlyCtc: number, basic: number): number {
  if (line.calc === 'FIXED') return toPaise(line.value);
  if (line.calc === 'PERCENT_OF_CTC') return Math.round((monthlyCtc * line.value) / 100);
  if (line.calc === 'PERCENT_OF_BASIC') return Math.round((basic * line.value) / 100);
  return 0;
}

/**
 * Turn an annual CTC into monthly pay lines with HR's salary template. The
 * first line is the basic; BALANCE takes what is left of the monthly CTC after
 * every other earning and employer contribution (never below zero), so the
 * lines add back up to the CTC whenever the template leaves room.
 */
export function applySalaryTemplate(annualCtc: number, template: readonly HrTemplateLine[]): HrPayLineRecord[] {
  const monthlyCtc = Math.round(toPaise(annualCtc) / 12);
  const first = template[0];
  const basic = first ? linePaise(first, monthlyCtc, 0) : 0;
  const priced = template.map((line) => ({ line, paise: linePaise(line, monthlyCtc, basic) }));
  const used = priced.reduce((sum, { line, paise }) => (line.calc === 'BALANCE' || line.type === 'DEDUCTION' ? sum : sum + paise), 0);
  return priced.map(({ line, paise }) => ({
    label: line.label,
    type: line.type,
    monthly_amount: toRupees(line.calc === 'BALANCE' ? Math.max(0, monthlyCtc - used) : paise),
    target_linked: line.target_linked,
  }));
}

/** The currency's own symbol from its ISO code — nothing is hardcoded to rupees. */
export function currencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .filter((part) => part.type === 'currency')
      .map((part) => part.value)
      .join('');
  } catch {
    return currency;
  }
}

/** `₹1,25,000` (or `$` …) from an amount and its ISO currency. */
export const formatCurrency = (value: number, currency: string, decimals = 0): string =>
  formatMoney(value, { symbol: currencySymbol(currency), decimals });

const pad2 = (n: number) => String(n).padStart(2, '0');

/** A calendar date as the `YYYY-MM-DD` key HR stores, read in the viewer's own zone. */
export const dayKeyOf = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** The local-midnight Date for a `YYYY-MM-DD` key, or null for anything else. */
export function dateOfDayKey(key: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getDate() === Number(match[3]) ? date : null;
}

/** `months` after a day key, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsToDayKey(key: string, months: number): string | null {
  const start = dateOfDayKey(key);
  if (!start) return null;
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), last));
  return dayKeyOf(target);
}

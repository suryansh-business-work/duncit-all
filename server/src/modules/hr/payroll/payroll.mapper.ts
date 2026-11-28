import type { TableEntityConfig } from '@utils/table-query';
import { todayKey } from '@modules/hr/employee/employee.events';
import type { IPayrollAmount, IPayrollLine, IPayrollRun, IPayrollStep } from './payroll.model';

/** The API speaks rupees, like the HR pay revisions; everything is stored in paise. */
const rupees = (paise: number) => Math.round(paise) / 100;
const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : null);

const step = (s: IPayrollStep | null) => (s ? { by: s.by.name, at: iso(s.at), note: s.note } : null);
const amount = (a: IPayrollAmount) => ({ label: a.label, monthly_amount: rupees(a.monthly_paise), amount: rupees(a.amount_paise) });

export const RUN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['month'],
  sortFields: { month: 'month', status: 'status', net: 'totals.net_paise', employees: 'totals.employees', created_at: 'created_at' },
  filterFields: { status: { type: 'enum' }, month: { type: 'string' }, source: { type: 'enum' } },
  defaultSort: { month: -1 },
};

export const LINE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['employee.name', 'employee.code', 'employee.department', 'payout.utr'],
  sortFields: {
    employee_name: 'employee.name',
    employee_code: 'employee.code',
    department: 'employee.department',
    net: 'net_paise',
    gross: 'gross_paise',
    lop_days: 'lop_days',
  },
  filterFields: {
    issues: { type: 'enum' },
    department: { path: 'employee.department', type: 'string' },
    payout_status: { path: 'payout.status', type: 'enum' },
  },
  defaultSort: { 'employee.name': 1 },
};

export function toRun(run: IPayrollRun) {
  return {
    id: String(run._id),
    month: run.month,
    status: run.status,
    scheduled_pay_date: run.scheduled_pay_date,
    pay_on: run.pay_on,
    source: run.source,
    totals: {
      employees: run.totals.employees,
      held: run.totals.held,
      gross: rupees(run.totals.gross_paise),
      deductions: rupees(run.totals.deductions_paise),
      net: rupees(run.totals.net_paise),
      employer: rupees(run.totals.employer_paise),
    },
    computed_at: iso(run.computed_at),
    computed_by: run.computed_by.name,
    approved: step(run.approved),
    approved_by_id: run.approved?.by.user_id ? String(run.approved.by.user_id) : null,
    released: step(run.released),
    returned: step(run.returned),
    revision: run.revision,
    created_at: iso(run.created_at),
  };
}

export function toLine(line: IPayrollLine) {
  const payout = line.payout;
  return {
    id: String(line._id),
    run_id: String(line.run_id),
    month: line.month,
    employee_id: String(line.employee_id),
    employee_name: line.employee.name,
    employee_code: line.employee.code,
    job_title: line.employee.job_title,
    department: line.employee.department,
    date_of_joining: line.employee.date_of_joining,
    last_working_day: line.employee.last_working_day,
    currency: line.currency,
    days_in_month: line.days_in_month,
    payable_days: line.payable_days,
    lop_days: line.lop_days,
    earnings: line.earnings.map(amount),
    variable: line.variable.map((v) => ({
      target_id: String(v.target_id),
      target_month: v.target_month,
      label: v.label,
      base_amount: rupees(v.base_paise),
      completion_percent: v.completion_percent,
      amount: rupees(v.amount_paise),
    })),
    deductions: line.deductions.map(amount),
    employer: line.employer.map(amount),
    adjustments: line.adjustments.map((a) => ({ id: String(a._id), label: a.label, type: a.type, amount: rupees(a.amount_paise), note: a.note, by: a.by.name, at: iso(a.at) })),
    gross: rupees(line.gross_paise),
    deductions_total: rupees(line.deductions_paise),
    net: rupees(line.net_paise),
    employer_total: rupees(line.employer_paise),
    issues: line.issues,
    hold: step(line.hold),
    bank_last4: line.bank?.account_last4 ?? null,
    bank_ifsc: line.bank?.ifsc ?? null,
    payout: payout
      ? {
          status: payout.status,
          attempt: payout.attempt,
          utr: payout.utr || null,
          failure_reason: payout.failure_reason || null,
          razorpay_payout_id: payout.razorpay_payout_id || null,
          initiated_at: iso(payout.initiated_at),
          completed_at: iso(payout.completed_at),
        }
      : null,
    published: line.published,
  };
}

export type PayslipStatus = 'ON_HOLD' | 'NOT_PAYABLE' | 'SCHEDULED' | 'PROCESSING' | 'PAID' | 'FAILED';

/** Where an employee's salary stands, in the words the payslip shows. */
export function payslipStatusOf(line: Pick<IPayrollLine, 'hold' | 'payout' | 'bank'>, payOn: string | null, today = todayKey()): PayslipStatus {
  if (line.hold) return 'ON_HOLD';
  if (line.payout) return line.payout.status;
  if (!line.bank) return 'NOT_PAYABLE';
  return payOn && payOn > today ? 'SCHEDULED' : 'PROCESSING';
}

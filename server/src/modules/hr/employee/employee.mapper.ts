import type { Types } from 'mongoose';
import { HrEmployeeModel, type IHrActor, type IHrEmployee } from './employee.model';
import type { IHrCompensation } from './compensation.model';
import type { IHrEmployeeEvent } from './employeeEvent.model';
import { maskedTail, toRupees, type CompensationTotals } from './employee.rules';

const masked = (last4: string | null | undefined) => (last4 ? maskedTail(last4) : null);

const iso = (d?: Date | null): string | null => (d ? new Date(d).toISOString() : null);
const actor = (a: IHrActor | null | undefined) => (a ? { user_id: String(a.user_id), name: a.name } : null);

export const fullName = (e: Pick<IHrEmployee, 'personal'>) => `${e.personal.first_name} ${e.personal.last_name}`.trim();

export interface ManagerRef {
  id: string;
  employee_code: string;
  name: string;
  job_title: string | null;
}

export const toManagerRef = (e: Pick<IHrEmployee, '_id' | 'employee_code' | 'personal' | 'job'>): ManagerRef => ({
  id: String(e._id),
  employee_code: e.employee_code,
  name: fullName(e),
  job_title: e.job?.job_title ?? null,
});

/** The managers of a page of records in one query — never one lookup per row. */
export async function managersOf(rows: readonly Pick<IHrEmployee, 'job'>[]): Promise<Map<string, ManagerRef>> {
  const ids = [...new Set(rows.map((row) => row.job.manager_id).filter((id): id is Types.ObjectId => Boolean(id)).map(String))];
  if (ids.length === 0) return new Map();
  const managers = await HrEmployeeModel.find({ _id: { $in: ids } })
    .select('employee_code personal.first_name personal.last_name job.job_title')
    .lean<IHrEmployee[]>();
  return new Map(managers.map((m) => [String(m._id), toManagerRef(m)]));
}

/** The record as every console reads it. The bank block is masked; the full values need the audited reveal. */
export function toEmployee(e: IHrEmployee, managers: Map<string, ManagerRef>, email: string | null = null) {
  const managerId = e.job.manager_id ? String(e.job.manager_id) : null;
  return {
    id: String(e._id),
    user_id: String(e.user_id),
    employee_code: e.employee_code,
    status: e.status,
    full_name: fullName(e),
    account_email: email,
    personal: { ...e.personal, emergency_contact: e.personal.emergency_contact ?? null },
    job: { ...e.job, manager_id: managerId, manager: managerId ? (managers.get(managerId) ?? null) : null },
    bank: {
      account_holder_name: e.bank?.account_holder_name ?? null,
      account_number_masked: masked(e.bank?.account_last4),
      ifsc: e.bank?.ifsc ?? null,
      bank_name: e.bank?.bank_name ?? null,
      pan_masked: masked(e.bank?.pan_last4),
      uan: e.bank?.uan ?? null,
    },
    exit: e.exit ? { ...e.exit, recorded_by: actor(e.exit.recorded_by), recorded_at: iso(e.exit.recorded_at) } : null,
    revision: e.revision,
    created_by: actor(e.created_by),
    updated_by: actor(e.updated_by),
    created_at: iso(e.created_at),
    updated_at: iso(e.updated_at),
  };
}

const totalsInRupees = (t: CompensationTotals) => ({
  gross_monthly: toRupees(t.gross_monthly_paise),
  fixed_gross_monthly: toRupees(t.fixed_gross_monthly_paise),
  variable_monthly: toRupees(t.variable_monthly_paise),
  deductions_monthly: toRupees(t.deductions_monthly_paise),
  employer_monthly: toRupees(t.employer_monthly_paise),
  net_monthly: toRupees(t.net_monthly_paise),
  annual_ctc: toRupees(t.annual_ctc_paise),
});

/** One pay revision; `currentId` marks the one in force today. */
export function toCompensation(c: IHrCompensation, today: string, currentId: string | null) {
  return {
    id: String(c._id),
    employee_id: String(c.employee_id),
    currency: c.currency,
    effective_from: c.effective_from,
    reason: c.reason,
    note: c.note ?? null,
    components: c.components.map((line) => ({
      label: line.label,
      type: line.type,
      monthly_amount: toRupees(line.monthly_paise),
      target_linked: line.target_linked === true,
    })),
    totals: totalsInRupees(c.totals),
    is_current: currentId === String(c._id),
    is_upcoming: c.effective_from > today,
    created_by: actor(c.created_by),
    created_at: iso(c.created_at),
  };
}

export const toEvent = (e: IHrEmployeeEvent) => ({
  id: String(e._id),
  kind: e.kind,
  effective_date: e.effective_date,
  changes: e.changes,
  note: e.note ?? null,
  actor: actor(e.actor),
  created_at: iso(e.created_at),
});

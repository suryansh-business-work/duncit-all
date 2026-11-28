import { hrContactDefaults, hrContactValuesFrom } from '@duncit/forms/schemas';
import {
  addMonthsToDayKey,
  type HrBankSummary,
  type HrCompensationRecord,
  type HrJobRecord,
  type HrPersonalRecord,
  type HrSettingsRecord,
} from '@duncit/utils';
import type { BankValues, JobValues, PayLineValues, PayValues, PersonalValues } from './employee-fields.types';

export const EMPTY_PERSONAL: PersonalValues = { ...hrContactDefaults, first_name: '', last_name: '', gender: '', date_of_birth: '' };

export const personalValuesFrom = (p: HrPersonalRecord): PersonalValues => ({
  ...hrContactValuesFrom(p),
  first_name: p.first_name,
  last_name: p.last_name,
  gender: p.gender ?? '',
  date_of_birth: p.date_of_birth ?? '',
});

/** A blank job, its notice period from HR settings. */
export const emptyJob = (settings: Pick<HrSettingsRecord, 'default_notice_period_days'> | null): JobValues => ({
  job_title: '',
  department: '',
  work_location: '',
  manager: null,
  employment_type: 'FULL_TIME',
  date_of_joining: '',
  probation_end_date: '',
  notice_period_days: String(settings?.default_notice_period_days ?? 0),
  work_email: '',
});

export const jobValuesFrom = (job: HrJobRecord): JobValues => ({
  job_title: job.job_title,
  department: job.department ?? '',
  work_location: job.work_location ?? '',
  manager: job.manager,
  employment_type: job.employment_type,
  date_of_joining: job.date_of_joining,
  probation_end_date: job.probation_end_date ?? '',
  notice_period_days: String(job.notice_period_days),
  work_email: job.work_email ?? '',
});

/** The probation end HR settings suggest for a joining date, or '' when either is missing. */
export const suggestedProbationEnd = (joining: string, months: number): string =>
  joining && months > 0 ? (addMonthsToDayKey(joining, months) ?? '') : '';

export const BLANK_PAY_LINE: PayLineValues = { label: '', type: 'EARNING', monthly_amount: '', target_linked: false };

export const emptyPay = (currency: string, effectiveFrom: string, reason: PayValues['reason']): PayValues => ({
  currency,
  effective_from: effectiveFrom,
  reason,
  note: '',
  annual_ctc: '',
  lines: [{ ...BLANK_PAY_LINE }],
});

/** A new revision seeded from the one in force, so a raise only changes what moves. */
export const payValuesFrom = (current: HrCompensationRecord, effectiveFrom: string): PayValues => ({
  currency: current.currency,
  effective_from: effectiveFrom,
  reason: 'REVISION',
  note: '',
  annual_ctc: String(current.totals.annual_ctc),
  lines: current.components.map((line) => ({ ...line, monthly_amount: String(line.monthly_amount) })),
});

export const EMPTY_BANK: BankValues = { account_holder_name: '', account_number: '', ifsc: '', bank_name: '', pan: '', uan: '' };

/** The editable half of the stored details; sealed values stay out of the form (their boxes mean "keep"). */
export const bankValuesFrom = (bank: HrBankSummary): BankValues => ({
  ...EMPTY_BANK,
  account_holder_name: bank.account_holder_name ?? '',
  ifsc: bank.ifsc ?? '',
  bank_name: bank.bank_name ?? '',
  uan: bank.uan ?? '',
});

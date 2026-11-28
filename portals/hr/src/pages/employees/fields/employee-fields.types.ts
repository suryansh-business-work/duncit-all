import type { HrContactValues } from '@duncit/forms/schemas';
import type { useTranslation } from '@duncit/shell';
import type { HrCompensationReason, HrEmployeeRef, HrEmploymentType, HrGender, HrPayComponentType } from '@duncit/utils';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** Dates are `YYYY-MM-DD` strings ('' when empty), exactly as the API takes them. */
export interface PersonalValues extends HrContactValues {
  first_name: string;
  last_name: string;
  gender: '' | HrGender;
  date_of_birth: string;
}

export interface JobValues {
  job_title: string;
  department: string;
  work_location: string;
  manager: HrEmployeeRef | null;
  employment_type: HrEmploymentType;
  date_of_joining: string;
  probation_end_date: string;
  notice_period_days: string;
  work_email: string;
}

/** One pay line as typed — the amount stays text until the schema reads it. */
export interface PayLineValues {
  label: string;
  type: HrPayComponentType;
  monthly_amount: string;
  target_linked: boolean;
}

export interface PayValues {
  currency: string;
  effective_from: string;
  reason: HrCompensationReason;
  note: string;
  /** Only used to apply the salary template; never sent. */
  annual_ctc: string;
  lines: PayLineValues[];
}

export interface BankValues {
  account_holder_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string;
  pan: string;
  uan: string;
}

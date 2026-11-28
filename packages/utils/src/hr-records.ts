/**
 * The GraphQL selections the HR and Employee consoles make on HR records, and
 * the records they read back. One selection per shape, so the two consoles
 * cannot drift apart on what a record contains.
 */
import type {
  HrCompensationReason,
  HrEmployeeStatus,
  HrEmploymentType,
  HrEventKind,
  HrExitType,
  HrGender,
  HrPayComponentType,
  HrTemplateCalc,
} from './hr-employee';

export const HR_EMPLOYEE_REF_SELECTION = `
  id
  employee_code
  name
  job_title
`;

export const HR_EMPLOYEE_SELECTION = `
  id
  user_id
  employee_code
  status
  full_name
  account_email
  personal {
    first_name
    last_name
    gender
    date_of_birth
    personal_email
    phone_number
    phone_extension
    current_address
    permanent_address
    emergency_contact {
      name
      relation
      phone_number
      phone_extension
    }
  }
  job {
    job_title
    department
    work_location
    manager_id
    manager {
      ${HR_EMPLOYEE_REF_SELECTION}
    }
    employment_type
    date_of_joining
    probation_end_date
    notice_period_days
    work_email
  }
  bank {
    account_holder_name
    account_number_masked
    ifsc
    bank_name
    pan_masked
    uan
  }
  exit {
    exit_type
    resignation_date
    last_working_day
    reason
    eligible_for_rehire
    recorded_by {
      user_id
      name
    }
    recorded_at
  }
  revision
  created_at
  updated_at
`;

export const HR_COMPENSATION_SELECTION = `
  id
  currency
  effective_from
  reason
  note
  components {
    label
    type
    monthly_amount
    target_linked
  }
  totals {
    gross_monthly
    fixed_gross_monthly
    variable_monthly
    deductions_monthly
    employer_monthly
    net_monthly
    annual_ctc
  }
  is_current
  is_upcoming
  created_by {
    user_id
    name
  }
  created_at
`;

export const HR_SETTINGS_SELECTION = `
  employee_code_prefix
  employee_code_digits
  next_employee_code
  default_currency
  default_notice_period_days
  default_probation_months
  departments
  work_locations
  salary_template {
    label
    type
    calc
    value
    target_linked
  }
  updated_at
`;

export interface HrActorRecord {
  user_id: string;
  name: string;
}

export interface HrEmployeeRef {
  id: string;
  employee_code: string;
  name: string;
  job_title: string | null;
}

export interface HrEmergencyContact {
  name: string;
  relation: string | null;
  phone_number: string;
  phone_extension: string;
}

export interface HrPersonalRecord {
  first_name: string;
  last_name: string;
  gender: HrGender | null;
  date_of_birth: string | null;
  personal_email: string | null;
  phone_number: string | null;
  phone_extension: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_contact: HrEmergencyContact | null;
}

export interface HrJobRecord {
  job_title: string;
  department: string | null;
  work_location: string | null;
  manager_id: string | null;
  manager: HrEmployeeRef | null;
  employment_type: HrEmploymentType;
  date_of_joining: string;
  probation_end_date: string | null;
  notice_period_days: number;
  work_email: string | null;
}

export interface HrBankSummary {
  account_holder_name: string | null;
  account_number_masked: string | null;
  ifsc: string | null;
  bank_name: string | null;
  pan_masked: string | null;
  uan: string | null;
}

export interface HrExitRecord {
  exit_type: HrExitType;
  resignation_date: string | null;
  last_working_day: string;
  reason: string | null;
  eligible_for_rehire: boolean;
  recorded_by: HrActorRecord;
  recorded_at: string;
}

/** One employment record, as both consoles read it through {@link HR_EMPLOYEE_SELECTION}. */
export interface HrEmployeeRecord {
  id: string;
  user_id: string;
  employee_code: string;
  status: HrEmployeeStatus;
  full_name: string;
  account_email: string | null;
  personal: HrPersonalRecord;
  job: HrJobRecord;
  bank: HrBankSummary;
  exit: HrExitRecord | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface HrPayLineRecord {
  label: string;
  type: HrPayComponentType;
  monthly_amount: number;
  target_linked: boolean;
}

export interface HrCompensationTotalsRecord {
  gross_monthly: number;
  fixed_gross_monthly: number;
  variable_monthly: number;
  deductions_monthly: number;
  employer_monthly: number;
  net_monthly: number;
  annual_ctc: number;
}

export interface HrCompensationRecord {
  id: string;
  currency: string;
  effective_from: string;
  reason: HrCompensationReason;
  note: string | null;
  components: HrPayLineRecord[];
  totals: HrCompensationTotalsRecord;
  is_current: boolean;
  is_upcoming: boolean;
  created_by: HrActorRecord;
  created_at: string;
}

export interface HrTemplateLine {
  label: string;
  type: HrPayComponentType;
  calc: HrTemplateCalc;
  value: number;
  target_linked: boolean;
}

export interface HrSettingsRecord {
  employee_code_prefix: string;
  employee_code_digits: number;
  next_employee_code: string;
  default_currency: string;
  default_notice_period_days: number;
  default_probation_months: number;
  departments: string[];
  work_locations: string[];
  salary_template: HrTemplateLine[];
  updated_at: string | null;
}

export interface HrFieldChangeRecord {
  field: string;
  from: string | null;
  to: string | null;
}

export interface HrEmployeeEventRecord {
  id: string;
  kind: HrEventKind;
  effective_date: string;
  changes: HrFieldChangeRecord[];
  note: string | null;
  actor: HrActorRecord;
  created_at: string;
}

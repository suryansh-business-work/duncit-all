/**
 * HR employee records for the page specs: typed factories carrying
 * `__typename` (so MockedProvider's cache behaves like production) and the
 * Apollo responses the pages ask for.
 */
import type { MockedResponse } from '@apollo/client/testing';
import type { HrCompensationRecord, HrEmployeeRecord, HrSettingsRecord } from '@duncit/utils';
import {
  HR_EMPLOYEE_HISTORY,
  HR_EMPLOYEE_PROFILE,
  HR_EMPLOYEE_STATS,
  HR_EMPLOYEE_TARGETS,
  HR_UNRECORDED_EMPLOYEES,
  type HrProfile,
  type HrStats,
  type HrUnrecorded,
} from '../../src/lib/employee-queries';
import { HR_SETTINGS } from '../../src/lib/settings-queries';

const actor = { __typename: 'HrActor', user_id: 'u-hr', name: 'Asha Iyer' };

export function employeeRecord(over: Partial<HrEmployeeRecord> = {}): HrEmployeeRecord {
  return {
    __typename: 'HrEmployee',
    id: 'e1',
    user_id: 'u1',
    employee_code: 'EMP-0001',
    status: 'ACTIVE',
    full_name: 'Meera Nair',
    account_email: 'meera@x.com',
    personal: {
      __typename: 'HrPersonal',
      first_name: 'Meera',
      last_name: 'Nair',
      gender: 'FEMALE',
      date_of_birth: '1995-06-15',
      personal_email: 'meera.p@x.com',
      phone_number: '9876543210',
      phone_extension: '+91',
      current_address: 'Indiranagar',
      permanent_address: null,
      emergency_contact: null,
    },
    job: {
      __typename: 'HrJob',
      job_title: 'Community Manager',
      department: 'Growth',
      work_location: 'Bengaluru',
      manager_id: null,
      manager: null,
      employment_type: 'FULL_TIME',
      date_of_joining: '2026-01-05',
      probation_end_date: null,
      notice_period_days: 30,
      work_email: null,
    },
    bank: {
      __typename: 'HrBankSummary',
      account_holder_name: null,
      account_number_masked: null,
      ifsc: null,
      bank_name: null,
      pan_masked: null,
      uan: null,
    },
    exit: null,
    revision: 3,
    created_at: '2026-01-05T10:00:00.000Z',
    updated_at: '2026-01-05T10:00:00.000Z',
    ...over,
  } as HrEmployeeRecord;
}

export function compensationRecord(over: Partial<HrCompensationRecord> = {}): HrCompensationRecord {
  return {
    __typename: 'HrCompensation',
    id: 'c1',
    currency: 'INR',
    effective_from: '2026-01-05',
    reason: 'HIRE',
    note: null,
    components: [{ __typename: 'HrPayLine', label: 'Basic', type: 'EARNING', monthly_amount: 40000, target_linked: false }],
    totals: {
      __typename: 'HrCompensationTotals',
      gross_monthly: 40000,
      fixed_gross_monthly: 40000,
      variable_monthly: 0,
      deductions_monthly: 0,
      employer_monthly: 0,
      net_monthly: 40000,
      annual_ctc: 480000,
    },
    is_current: true,
    is_upcoming: false,
    created_by: actor,
    created_at: '2026-01-05T10:00:00.000Z',
    ...over,
  } as HrCompensationRecord;
}

export function profileRecord(over: Partial<HrProfile> = {}): HrProfile {
  const current = compensationRecord();
  return {
    __typename: 'HrEmployeeProfile',
    employee: employeeRecord(),
    has_employee_access: true,
    compensation: [current],
    current_compensation: current,
    direct_reports: [],
    seats: [],
    targets_console_url: 'https://targets.duncit.com/employee-targets',
    ...over,
  } as HrProfile;
}

export const settingsRecord = (over: Partial<HrSettingsRecord> = {}): HrSettingsRecord =>
  ({
    __typename: 'HrSettings',
    employee_code_prefix: 'EMP',
    employee_code_digits: 4,
    next_employee_code: 'EMP-0002',
    default_currency: 'INR',
    default_notice_period_days: 30,
    default_probation_months: 3,
    departments: ['Growth'],
    work_locations: [],
    salary_template: [],
    updated_at: null,
    ...over,
  }) as HrSettingsRecord;

const forever = { maxUsageCount: Number.POSITIVE_INFINITY };

export const profileMock = (profile: HrProfile): MockedResponse => ({
  request: { query: HR_EMPLOYEE_PROFILE, variables: { id: profile.employee.id } },
  result: { data: { hrEmployee: profile } },
  ...forever,
});

export const historyMock = (id: string): MockedResponse => ({
  request: { query: HR_EMPLOYEE_HISTORY, variables: { id } },
  result: {
    data: {
      hrEmployeeHistory: [
        {
          __typename: 'HrEmployeeEvent',
          id: 'ev1',
          kind: 'JOB_CHANGED',
          effective_date: '2026-06-01',
          changes: [{ __typename: 'HrFieldChange', field: 'job.job_title', from: 'Analyst', to: 'Community Manager' }],
          note: 'Strong year',
          actor,
          created_at: '2026-06-01T10:00:00.000Z',
        },
      ],
    },
  },
  ...forever,
});

export const targetsMock = (id: string): MockedResponse => ({
  request: { query: HR_EMPLOYEE_TARGETS, variables: { id } },
  result: { data: { hrEmployeeTargets: [] } },
  ...forever,
});

export const settingsMock = (settings: HrSettingsRecord = settingsRecord()): MockedResponse => ({
  request: { query: HR_SETTINGS },
  result: { data: { hrSettings: settings } },
  ...forever,
});

export const statsMock = (stats: Partial<HrStats> = {}): MockedResponse => ({
  request: { query: HR_EMPLOYEE_STATS },
  result: {
    data: {
      hrEmployeeStats: {
        __typename: 'HrEmployeeStats',
        active: 12,
        on_notice: 1,
        exited: 2,
        joined_this_month: 3,
        exited_this_month: 1,
        by_department: [{ __typename: 'HrDepartmentCount', department: 'Growth', count: 7 }, { __typename: 'HrDepartmentCount', department: null, count: 5 }],
        ...stats,
      },
    },
  },
  ...forever,
});

export const unrecordedMock = (people: HrUnrecorded[] = []): MockedResponse => ({
  request: { query: HR_UNRECORDED_EMPLOYEES },
  result: { data: { hrUnrecordedEmployees: people.map((p) => ({ __typename: 'HrUnrecordedEmployee', ...p })) } },
  ...forever,
});

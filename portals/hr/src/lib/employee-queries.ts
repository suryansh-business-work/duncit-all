import { gql } from '@apollo/client';
import {
  EMPLOYEE_TARGET_SELECTION,
  HR_COMPENSATION_SELECTION,
  HR_EMPLOYEE_REF_SELECTION,
  HR_EMPLOYEE_SELECTION,
  type EmployeeTargetRecord,
  type HrCompensationRecord,
  type HrEmployeeEventRecord,
  type HrEmployeeRecord,
  type HrEmployeeRef,
} from '@duncit/utils';
import type {
  HireHrEmployeeInput,
  HrBankInput,
  HrCompensationInput,
  HrExitInput,
  HrJobChangeInput,
  HrPersonalInput,
  HrRehireInput,
} from '@duncit/gql-types';

/** HR > Employees: the directory (DUNCIT TABLE CONTRACT v1). */
export const HR_EMPLOYEES_TABLE = gql`
  query HrEmployeesTable($query: TableQueryInput) {
    hrEmployeesTable(query: $query) {
      total
      page
      page_size
      rows {
        ${HR_EMPLOYEE_SELECTION}
      }
    }
  }
`;

const PROFILE_SELECTION = `
  employee {
    ${HR_EMPLOYEE_SELECTION}
  }
  has_employee_access
  compensation {
    ${HR_COMPENSATION_SELECTION}
  }
  current_compensation {
    ${HR_COMPENSATION_SELECTION}
  }
  direct_reports {
    ${HR_EMPLOYEE_REF_SELECTION}
  }
  seats {
    structure_id
    structure_name
    node_id
    title
    department
  }
  targets_console_url
`;

export const HR_EMPLOYEE_PROFILE = gql`
  query HrEmployee($id: ID!) {
    hrEmployee(id: $id) {
      ${PROFILE_SELECTION}
    }
  }
`;

export const HR_EMPLOYEE_HISTORY = gql`
  query HrEmployeeHistory($id: ID!) {
    hrEmployeeHistory(id: $id) {
      id
      kind
      effective_date
      changes {
        field
        from
        to
      }
      note
      actor {
        user_id
        name
      }
      created_at
    }
  }
`;

export const HR_EMPLOYEE_TARGETS = gql`
  query HrEmployeeTargets($id: ID!) {
    hrEmployeeTargets(id: $id) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

export const HR_EMPLOYEE_BANK_DETAILS = gql`
  query HrEmployeeBankDetails($id: ID!) {
    hrEmployeeBankDetails(id: $id) {
      account_holder_name
      account_number
      ifsc
      bank_name
      pan
      uan
    }
  }
`;

export const HR_MANAGER_OPTIONS = gql`
  query HrManagerOptions($search: String, $excludeId: ID) {
    hrManagerOptions(search: $search, exclude_id: $excludeId) {
      ${HR_EMPLOYEE_REF_SELECTION}
    }
  }
`;

export const HR_ACCOUNT_OPTIONS = gql`
  query HrAccountOptions($search: String!) {
    hrAccountOptions(search: $search) {
      id
      name
      email
      phone
      photo
      has_hr_record
    }
  }
`;

export const HR_UNRECORDED_EMPLOYEES = gql`
  query HrUnrecordedEmployees {
    hrUnrecordedEmployees {
      id
      name
      email
      photo
    }
  }
`;

export const HR_EMPLOYEE_STATS = gql`
  query HrEmployeeStats {
    hrEmployeeStats {
      active
      on_notice
      exited
      joined_this_month
      exited_this_month
      by_department {
        department
        count
      }
    }
  }
`;

export const HIRE_HR_EMPLOYEE = gql`
  mutation HireHrEmployee($input: HireHrEmployeeInput!) {
    hireHrEmployee(input: $input) {
      ${PROFILE_SELECTION}
    }
  }
`;

export const UPDATE_HR_PERSONAL = gql`
  mutation UpdateHrEmployeePersonal($id: ID!, $input: HrPersonalInput!, $expectedRevision: Int!) {
    updateHrEmployeePersonal(id: $id, input: $input, expected_revision: $expectedRevision) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const CHANGE_HR_JOB = gql`
  mutation ChangeHrEmployeeJob($id: ID!, $input: HrJobChangeInput!) {
    changeHrEmployeeJob(id: $id, input: $input) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const UPDATE_HR_BANK = gql`
  mutation UpdateHrEmployeeBank($id: ID!, $input: HrBankInput!, $expectedRevision: Int!) {
    updateHrEmployeeBank(id: $id, input: $input, expected_revision: $expectedRevision) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const SCHEDULE_HR_EXIT = gql`
  mutation ScheduleHrEmployeeExit($id: ID!, $input: HrExitInput!) {
    scheduleHrEmployeeExit(id: $id, input: $input) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const CANCEL_HR_EXIT = gql`
  mutation CancelHrEmployeeExit($id: ID!, $expectedRevision: Int!) {
    cancelHrEmployeeExit(id: $id, expected_revision: $expectedRevision) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const REHIRE_HR_EMPLOYEE = gql`
  mutation RehireHrEmployee($id: ID!, $input: HrRehireInput!) {
    rehireHrEmployee(id: $id, input: $input) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const RESTORE_HR_ACCESS = gql`
  mutation RestoreHrEmployeeAccess($id: ID!) {
    restoreHrEmployeeAccess(id: $id) {
      ${HR_EMPLOYEE_SELECTION}
    }
  }
`;

export const ADD_HR_COMPENSATION = gql`
  mutation AddHrCompensation($employeeId: ID!, $input: HrCompensationInput!) {
    addHrCompensation(employee_id: $employeeId, input: $input) {
      ${HR_COMPENSATION_SELECTION}
    }
  }
`;

export const REMOVE_HR_COMPENSATION = gql`
  mutation RemoveHrCompensation($id: ID!) {
    removeHrCompensation(id: $id)
  }
`;

export interface HrSeatRef {
  structure_id: string;
  structure_name: string;
  node_id: string;
  title: string;
  department: string | null;
}

export interface HrProfile {
  employee: HrEmployeeRecord;
  has_employee_access: boolean;
  compensation: HrCompensationRecord[];
  current_compensation: HrCompensationRecord | null;
  direct_reports: HrEmployeeRef[];
  seats: HrSeatRef[];
  targets_console_url: string | null;
}

export interface HrAccountOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  has_hr_record: boolean;
}

export interface HrUnrecorded {
  id: string;
  name: string;
  email: string | null;
  photo: string | null;
}

export interface HrStats {
  active: number;
  on_notice: number;
  exited: number;
  joined_this_month: number;
  exited_this_month: number;
  by_department: { department: string | null; count: number }[];
}

export interface HrBankDetails {
  account_holder_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  bank_name: string | null;
  pan: string | null;
  uan: string | null;
}

export type ProfileData = { hrEmployee: HrProfile };
export type HistoryData = { hrEmployeeHistory: HrEmployeeEventRecord[] };
export type TargetsData = { hrEmployeeTargets: EmployeeTargetRecord[] };
export type BankDetailsData = { hrEmployeeBankDetails: HrBankDetails };
export type ManagerOptionsData = { hrManagerOptions: HrEmployeeRef[] };
export type AccountOptionsData = { hrAccountOptions: HrAccountOption[] };
export type UnrecordedData = { hrUnrecordedEmployees: HrUnrecorded[] };
export type StatsData = { hrEmployeeStats: HrStats };
export type HireData = { hireHrEmployee: HrProfile };
export type HireVars = { input: HireHrEmployeeInput };
export type PersonalVars = { id: string; input: HrPersonalInput; expectedRevision: number };
export type JobVars = { id: string; input: HrJobChangeInput };
export type BankVars = { id: string; input: HrBankInput; expectedRevision: number };
export type ExitVars = { id: string; input: HrExitInput };
export type RehireVars = { id: string; input: HrRehireInput };
export type CompensationVars = { employeeId: string; input: HrCompensationInput };

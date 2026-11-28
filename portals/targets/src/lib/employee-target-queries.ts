import { gql } from '@apollo/client';
import { EMPLOYEE_TARGET_SELECTION, type EmployeeTargetRecord } from '@duncit/utils';
import type {
  AssignEmployeeTargetInput,
  EmployeeTargetSettings,
  EmployeeTargetSettingsInput,
  ReviewEmployeeTargetInput,
  UpdateEmployeeTargetInput,
} from '@duncit/gql-types';

/** Targets > Employee Targets: the assignments, newest month first (DUNCIT TABLE CONTRACT v1). */
export const EMPLOYEE_TARGETS_TABLE = gql`
  query EmployeeTargetsTable($query: TableQueryInput) {
    employeeTargetsTable(query: $query) {
      total
      page
      page_size
      rows {
        ${EMPLOYEE_TARGET_SELECTION}
      }
    }
  }
`;

export const TARGET_ASSIGNABLE_EMPLOYEES = gql`
  query TargetAssignableEmployees($search: String) {
    targetAssignableEmployees(search: $search) {
      id
      name
      email
      employee_code
      job_title
      department
    }
  }
`;

export const ASSIGN_EMPLOYEE_TARGET = gql`
  mutation AssignEmployeeTarget($input: AssignEmployeeTargetInput!) {
    assignEmployeeTarget(input: $input) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

export const UPDATE_EMPLOYEE_TARGET = gql`
  mutation UpdateEmployeeTarget($id: ID!, $input: UpdateEmployeeTargetInput!) {
    updateEmployeeTarget(id: $id, input: $input) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

export const REVIEW_EMPLOYEE_TARGET = gql`
  mutation ReviewEmployeeTarget($id: ID!, $input: ReviewEmployeeTargetInput!) {
    reviewEmployeeTarget(id: $id, input: $input) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

export const REOPEN_EMPLOYEE_TARGET = gql`
  mutation ReopenEmployeeTarget($id: ID!, $expectedRevision: Int!) {
    reopenEmployeeTarget(id: $id, expected_revision: $expectedRevision) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

export const DELETE_EMPLOYEE_TARGET = gql`
  mutation DeleteEmployeeTarget($id: ID!) {
    deleteEmployeeTarget(id: $id)
  }
`;

export const EMPLOYEE_TARGET_SETTINGS = gql`
  query EmployeeTargetSettings {
    employeeTargetSettings {
      reminders_enabled
      reminder_days_before_end
      reminder_grace_days
      updated_at
    }
  }
`;

export const UPDATE_EMPLOYEE_TARGET_SETTINGS = gql`
  mutation UpdateEmployeeTargetSettings($input: EmployeeTargetSettingsInput!) {
    updateEmployeeTargetSettings(input: $input) {
      reminders_enabled
      reminder_days_before_end
      reminder_grace_days
      updated_at
    }
  }
`;

/** An employee the picker offers — exactly what TARGET_ASSIGNABLE_EMPLOYEES selects. */
export interface AssigneeOption {
  id: string;
  name: string;
  email?: string | null;
  /** From the HR directory — null when HR has no current record for this account. */
  employee_code?: string | null;
  job_title?: string | null;
  department?: string | null;
}
export type TargetSettings = Omit<EmployeeTargetSettings, '__typename'>;

export interface AssignableData {
  targetAssignableEmployees: AssigneeOption[];
}
export interface AssignTargetData {
  assignEmployeeTarget: EmployeeTargetRecord;
}
export interface AssignTargetVars {
  input: AssignEmployeeTargetInput;
}
export interface UpdateTargetData {
  updateEmployeeTarget: EmployeeTargetRecord;
}
export interface UpdateTargetVars {
  id: string;
  input: UpdateEmployeeTargetInput;
}
export interface ReviewTargetData {
  reviewEmployeeTarget: EmployeeTargetRecord;
}
export interface ReviewTargetVars {
  id: string;
  input: ReviewEmployeeTargetInput;
}
export interface ReopenTargetData {
  reopenEmployeeTarget: EmployeeTargetRecord;
}
export interface ReopenTargetVars {
  id: string;
  expectedRevision: number;
}
export interface SettingsData {
  employeeTargetSettings: TargetSettings;
}
export interface UpdateSettingsData {
  updateEmployeeTargetSettings: TargetSettings;
}
export interface UpdateSettingsVars {
  input: EmployeeTargetSettingsInput;
}

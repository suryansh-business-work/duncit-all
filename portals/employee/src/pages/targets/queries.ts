import { gql } from '@apollo/client';
import { EMPLOYEE_TARGET_SELECTION, type EmployeeTargetRecord } from '@duncit/utils';

/** Employee > My Targets: the caller's own months, newest first (DUNCIT TABLE CONTRACT v1). */
export const MY_EMPLOYEE_TARGETS_TABLE = gql`
  query MyEmployeeTargetsTable($query: TableQueryInput) {
    myEmployeeTargetsTable(query: $query) {
      total
      rows {
        ${EMPLOYEE_TARGET_SELECTION}
      }
    }
  }
`;

export const MY_EMPLOYEE_TARGET = gql`
  query MyEmployeeTarget($id: ID!) {
    myEmployeeTarget(id: $id) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

/** The months still waiting for a report inside the reminder window — the banner's only source. */
export const MY_DUE_EMPLOYEE_TARGETS = gql`
  query MyDueEmployeeTargets {
    myDueEmployeeTargets {
      id
      month
    }
  }
`;

export const SUBMIT_EMPLOYEE_TARGET = gql`
  mutation SubmitEmployeeTarget($id: ID!, $input: SubmitEmployeeTargetInput!) {
    submitEmployeeTarget(id: $id, input: $input) {
      ${EMPLOYEE_TARGET_SELECTION}
    }
  }
`;

export interface MyTargetData {
  myEmployeeTarget: EmployeeTargetRecord;
}
export interface MyDueTargetsData {
  myDueEmployeeTargets: Pick<EmployeeTargetRecord, 'id' | 'month'>[];
}
export interface SubmitTargetData {
  submitEmployeeTarget: EmployeeTargetRecord;
}
export interface SubmitTargetVars {
  id: string;
  input: {
    completion_percent: number;
    achievements: { title: string; details: string }[];
    updates: string;
    expected_revision: number;
  };
}

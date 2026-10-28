import { gql } from '@apollo/client';
import type {
  ManualTestCaseInput,
  QueryManualTestCaseActivityArgs,
  QueryManualTestCaseArgs,
} from '@duncit/gql-types';
import type { ManualActivity, ManualCase } from './types';

// Every field the case page shows or edits. Every mutation answers with all of
// them, so Apollo's cache updates the open page without a refetch.
const CASE_FIELDS = `
  id
  key
  title
  type
  priority
  column_id
  column {
    id
    name
    category
  }
  assignee_id
  assignee {
    id
    name
    photo
  }
  reporter_id
  reporter {
    id
    name
    photo
  }
  labels
  surface
  environment
  description
  preconditions
  expected_result
  actual_result
  steps {
    action
    expected
  }
  e2e_flow {
    id
    name
  }
  e2e_sub_flow {
    id
    name
  }
  due_date
  estimate_minutes
  created_at
  updated_at
`;

export const MANUAL_TEST_CASE = gql`
  query ManualTestCase($key: String!) {
    manualTestCase(key: $key) {
      ${CASE_FIELDS}
    }
  }
`;

export const UPDATE_MANUAL_CASE = gql`
  mutation UpdateManualCase($id: ID!, $input: ManualTestCaseInput!, $expected_updated_at: String) {
    updateManualCase(id: $id, input: $input, expected_updated_at: $expected_updated_at) {
      ${CASE_FIELDS}
    }
  }
`;

export const DELETE_MANUAL_CASE = gql`
  mutation DeleteManualCase($id: ID!) {
    deleteManualCase(id: $id)
  }
`;

export const MANUAL_TEST_CASES_TABLE = gql`
  query ManualTestCasesTable($query: TableQueryInput) {
    manualTestCasesTable(query: $query) {
      rows {
        id
        key
        title
        type
        priority
        column_id
        column {
          id
          name
          category
        }
        assignee {
          id
          name
          photo
        }
        surface
        environment
        labels
        updated_at
      }
      total
      page
      page_size
    }
  }
`;

export const MANUAL_TEST_CASE_ACTIVITY = gql`
  query ManualTestCaseActivity($id: ID!, $offset: Int) {
    manualTestCaseActivity(id: $id, offset: $offset) {
      total
      rows {
        id
        action
        field
        old_value
        new_value
        created_at
        actor {
          id
          name
          photo
        }
      }
    }
  }
`;

export interface CaseData {
  manualTestCase: ManualCase | null;
}
export type CaseVariables = QueryManualTestCaseArgs;

export interface UpdateCaseData {
  updateManualCase: ManualCase;
}
export interface UpdateCaseVariables {
  id: string;
  input: ManualTestCaseInput;
  expected_updated_at?: string | null;
}

export interface ActivityData {
  manualTestCaseActivity: { total: number; rows: ManualActivity[] };
}
export type ActivityVariables = QueryManualTestCaseActivityArgs;

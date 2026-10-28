import { gql } from '@apollo/client';
import type {
  ManualTestBoardFilter,
  MutationMoveManualCaseArgs,
  QueryManualTestColumnCasesArgs,
} from '@duncit/gql-types';
import type { BoardData, ManualCard } from './types';

// What a card shows, and what a move needs back (rank, updated_at).
const CARD_FIELDS = `
  id
  key
  title
  type
  priority
  column_id
  rank
  labels
  due_date
  updated_at
  assignee {
    id
    name
    photo
  }
`;

export const MANUAL_TEST_BOARD = gql`
  query ManualTestBoard($filter: ManualTestBoardFilter) {
    manualTestBoard(filter: $filter) {
      columns {
        column {
          id
          name
          order
          category
          wip_limit
          case_count
        }
        total
        cases {
          ${CARD_FIELDS}
        }
      }
    }
  }
`;

export const MANUAL_TEST_COLUMN_CASES = gql`
  query ManualTestColumnCases($column_id: ID!, $filter: ManualTestBoardFilter, $offset: Int) {
    manualTestColumnCases(column_id: $column_id, filter: $filter, offset: $offset) {
      total
      cases {
        ${CARD_FIELDS}
      }
    }
  }
`;

export const MOVE_MANUAL_CASE = gql`
  mutation MoveManualCase(
    $id: ID!
    $column_id: ID!
    $before_id: ID
    $after_id: ID
    $expected_updated_at: String
  ) {
    moveManualCase(
      id: $id
      column_id: $column_id
      before_id: $before_id
      after_id: $after_id
      expected_updated_at: $expected_updated_at
    ) {
      ${CARD_FIELDS}
    }
  }
`;

export const CREATE_MANUAL_CASE = gql`
  mutation CreateManualCase($input: ManualTestCaseInput!) {
    createManualCase(input: $input) {
      id
      key
    }
  }
`;

export interface BoardVariables {
  filter: ManualTestBoardFilter;
}

export type { BoardData };

export interface ColumnCasesData {
  manualTestColumnCases: { total: number; cases: ManualCard[] };
}

export type ColumnCasesVariables = QueryManualTestColumnCasesArgs;

export interface MoveData {
  moveManualCase: ManualCard;
}

export type MoveVariables = MutationMoveManualCaseArgs;

export interface CreateCaseData {
  createManualCase: { id: string; key: string };
}

import { gql } from '@apollo/client';
import type {
  ManualTestColumnInput,
  MutationDeleteManualTestColumnArgs,
  MutationReorderManualTestColumnsArgs,
} from '@duncit/gql-types';
import type { ManualColumn } from './types';

const COLUMN_FIELDS = `
  id
  name
  order
  category
  wip_limit
  case_count
`;

export const CREATE_MANUAL_TEST_COLUMN = gql`
  mutation CreateManualTestColumn($input: ManualTestColumnInput!) {
    createManualTestColumn(input: $input) {
      ${COLUMN_FIELDS}
    }
  }
`;

export const UPDATE_MANUAL_TEST_COLUMN = gql`
  mutation UpdateManualTestColumn($id: ID!, $input: ManualTestColumnInput!) {
    updateManualTestColumn(id: $id, input: $input) {
      ${COLUMN_FIELDS}
    }
  }
`;

export const REORDER_MANUAL_TEST_COLUMNS = gql`
  mutation ReorderManualTestColumns($ids: [ID!]!) {
    reorderManualTestColumns(ids: $ids) {
      ${COLUMN_FIELDS}
    }
  }
`;

export const DELETE_MANUAL_TEST_COLUMN = gql`
  mutation DeleteManualTestColumn($id: ID!, $target_column_id: ID!) {
    deleteManualTestColumn(id: $id, target_column_id: $target_column_id)
  }
`;

export interface SaveColumnVariables {
  id?: string;
  input: ManualTestColumnInput;
}
export interface CreateColumnData {
  createManualTestColumn: ManualColumn;
}
export interface UpdateColumnData {
  updateManualTestColumn: ManualColumn;
}
export interface ReorderColumnsData {
  reorderManualTestColumns: ManualColumn[];
}
export type ReorderColumnsVariables = MutationReorderManualTestColumnsArgs;
export type DeleteColumnVariables = MutationDeleteManualTestColumnArgs;

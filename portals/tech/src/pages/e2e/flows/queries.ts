import { gql } from '@apollo/client';

export interface E2eFlowStep {
  action: string;
  expected: string;
}

/** A tech admin's verdict on a sub flow; only LOOKS_GOOD ones are ready for e2e. */
export type E2eReviewStatus = 'NOT_REVIEWED' | 'NEEDS_REVIEW' | 'LOOKS_GOOD';

export interface E2eSubFlow {
  id: string;
  name: string;
  description: string;
  steps: E2eFlowStep[];
  review_status: E2eReviewStatus;
  reviewed_by: string;
  reviewed_at: string | null;
}

export interface E2eFlowRow {
  id: string;
  name: string;
  description: string;
  sub_flow_count: number;
  looks_good_count: number;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface E2eFlow extends E2eFlowRow {
  sub_flows: E2eSubFlow[];
}

const ROW_FIELDS = `
  id
  name
  description
  sub_flow_count
  looks_good_count
  created_by
  created_at
  updated_at
`;

// Every mutation answers with the whole flow, so Apollo's cache updates the
// open flow page without a refetch.
const FLOW_FIELDS = `
  ${ROW_FIELDS}
  sub_flows {
    id
    name
    description
    steps {
      action
      expected
    }
    review_status
    reviewed_by
    reviewed_at
  }
`;

export const E2E_FLOWS_TABLE = gql`
  query E2eFlowsTable($query: TableQueryInput) {
    e2eFlowsTable(query: $query) {
      rows {
        ${ROW_FIELDS}
      }
      total
      page
      page_size
    }
  }
`;

export const E2E_FLOW = gql`
  query E2eFlow($id: ID!) {
    e2eFlow(id: $id) {
      ${FLOW_FIELDS}
    }
  }
`;

export const CREATE_E2E_FLOW = gql`
  mutation CreateE2eFlow($input: E2eFlowInput!) {
    createE2eFlow(input: $input) {
      ${ROW_FIELDS}
    }
  }
`;

export const UPDATE_E2E_FLOW = gql`
  mutation UpdateE2eFlow($id: ID!, $input: E2eFlowInput!) {
    updateE2eFlow(id: $id, input: $input) {
      ${FLOW_FIELDS}
    }
  }
`;

export const DELETE_E2E_FLOW = gql`
  mutation DeleteE2eFlow($id: ID!) {
    deleteE2eFlow(id: $id)
  }
`;

export const CREATE_E2E_SUB_FLOW = gql`
  mutation CreateE2eSubFlow($flow_id: ID!, $input: E2eSubFlowInput!) {
    createE2eSubFlow(flow_id: $flow_id, input: $input) {
      ${FLOW_FIELDS}
    }
  }
`;

export const UPDATE_E2E_SUB_FLOW = gql`
  mutation UpdateE2eSubFlow($flow_id: ID!, $sub_flow_id: ID!, $input: E2eSubFlowInput!) {
    updateE2eSubFlow(flow_id: $flow_id, sub_flow_id: $sub_flow_id, input: $input) {
      ${FLOW_FIELDS}
    }
  }
`;

export const DELETE_E2E_SUB_FLOW = gql`
  mutation DeleteE2eSubFlow($flow_id: ID!, $sub_flow_id: ID!) {
    deleteE2eSubFlow(flow_id: $flow_id, sub_flow_id: $sub_flow_id) {
      ${FLOW_FIELDS}
    }
  }
`;

export const REVIEW_E2E_SUB_FLOW = gql`
  mutation ReviewE2eSubFlow($flow_id: ID!, $sub_flow_id: ID!, $status: E2eReviewStatus!) {
    reviewE2eSubFlow(flow_id: $flow_id, sub_flow_id: $sub_flow_id, status: $status) {
      ${FLOW_FIELDS}
    }
  }
`;

/** An error from a mutation, as a string — notifyError takes nothing else. */
export const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

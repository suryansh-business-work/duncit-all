import { gql } from '@apollo/client';

// NOTE: no page imports this since the DuncitTable migration (kept per the
// table contract — existing list queries are never removed by a migration).
export const POLICIES = gql`
  query LegalPolicies($filter: PolicyFilterInput) {
    policies(filter: $filter) {
      id
      slug
      title
      content
      is_active
      sort_order
      updated_at
    }
  }
`;

// Row selection keeps 'content': the edit dialog pre-fills from the row object.
export const POLICIES_TABLE = gql`
  query LegalPoliciesTable($query: TableQueryInput) {
    policiesTable(query: $query) {
      total
      rows {
        id
        slug
        title
        content
        is_active
        sort_order
        updated_at
      }
    }
  }
`;

export const CREATE_POLICY = gql`
  mutation CreateLegalPolicy($input: CreatePolicyInput!) {
    createPolicy(input: $input) {
      id
    }
  }
`;

export const UPDATE_POLICY = gql`
  mutation UpdateLegalPolicy($id: ID!, $input: UpdatePolicyInput!) {
    updatePolicy(policy_doc_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_POLICY = gql`
  mutation DeleteLegalPolicy($id: ID!) {
    deletePolicy(policy_doc_id: $id)
  }
`;

export interface Policy {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

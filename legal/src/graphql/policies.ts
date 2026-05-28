import { gql } from '@apollo/client';

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

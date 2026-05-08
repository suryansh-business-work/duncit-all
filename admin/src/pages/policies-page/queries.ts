import { gql } from '@apollo/client';

export const POLICIES = gql`
  query AdminPolicies($filter: PolicyFilterInput) {
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
  mutation CreatePolicy($input: CreatePolicyInput!) {
    createPolicy(input: $input) {
      id
    }
  }
`;

export const UPDATE_POLICY = gql`
  mutation UpdatePolicy($id: ID!, $input: UpdatePolicyInput!) {
    updatePolicy(policy_doc_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_POLICY = gql`
  mutation DeletePolicy($id: ID!) {
    deletePolicy(policy_doc_id: $id)
  }
`;

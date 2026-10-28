import { gql } from '@apollo/client';

export interface LiteAdminPolicy {
  id: string;
  title: string;
  slug: string;
  /** Rich-text HTML from the shared editor. */
  content: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string | null;
}

export interface LitePolicyInput {
  title: string;
  slug: string | null;
  content: string;
  sort_order: number;
  is_active: boolean;
}

const POLICY_FIELDS = gql`
  fragment LiteAdminPolicyFields on LiteAdminPolicy {
    id
    title
    slug
    content
    sort_order
    is_active
    updated_at
  }
`;

export const LITE_ADMIN_POLICIES = gql`
  query LiteAdminPolicies {
    liteAdminPolicies {
      ...LiteAdminPolicyFields
    }
  }
  ${POLICY_FIELDS}
`;

export const LITE_UPSERT_POLICY = gql`
  mutation LiteUpsertPolicy($id: ID, $input: LitePolicyInput!) {
    liteUpsertPolicy(id: $id, input: $input) {
      ...LiteAdminPolicyFields
    }
  }
  ${POLICY_FIELDS}
`;

export const LITE_DELETE_POLICY = gql`
  mutation LiteDeletePolicy($id: ID!) {
    liteDeletePolicy(id: $id)
  }
`;

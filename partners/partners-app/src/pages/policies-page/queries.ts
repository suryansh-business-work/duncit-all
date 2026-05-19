import { gql } from '@apollo/client';

export const PUBLIC_POLICIES = gql`
  query PartnerPublicPolicies {
    publicPolicies {
      id
      slug
      title
      updated_at
    }
  }
`;

export const POLICY_BY_SLUG = gql`
  query PartnerPolicyBySlug($slug: String!) {
    policyBySlug(slug: $slug) {
      id
      slug
      title
      content
      is_active
      updated_at
    }
  }
`;
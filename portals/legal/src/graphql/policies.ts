import { gql } from '@apollo/client';

// NOTE: no page imports this since the DuncitTable migration (kept per the
// table contract — existing list queries are never removed by a migration).
export const POLICIES = gql`
  query LegalPolicies($filter: PolicyFilterInput) {
    policies(filter: $filter) {
      id
      policy_no
      slug
      title
      policy_type
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
        policy_no
        slug
        title
        policy_type
        content
        is_active
        sort_order
        version_count
        content_hash
        last_notified_at
        last_notified_count
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
  /** Permanent handle, POL-000001. Never edited, never reused. */
  policy_no: string;
  slug: string;
  title: string;
  /** Groups this policy on the dashboard. Blank counts as "Other". */
  policy_type: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  /** Every wording it has had, the live one included. Never fewer than 1. */
  version_count: number;
  /** sha256 of the CURRENT wording — what a fresh acceptance records. */
  content_hash: string;
  /** When Legal last emailed everyone who had accepted it. */
  last_notified_at: string | null;
  last_notified_count: number;
  updated_at: string;
}

/** One wording a policy has had. The live one comes back flagged `is_current`. */
export interface PolicyVersion {
  id: string;
  version_no: number;
  title: string;
  slug: string;
  policy_type: string;
  content: string;
  content_hash: string;
  updated_by_name: string;
  created_at: string;
  is_current: boolean;
}

export const POLICY_VERSIONS = gql`
  query LegalPolicyVersions($id: ID!) {
    policyVersions(policy_doc_id: $id) {
      id
      version_no
      title
      slug
      policy_type
      content
      content_hash
      updated_by_name
      created_at
      is_current
    }
  }
`;

/**
 * How many accounts a change notice would reach right now.
 *
 * Read live rather than derived from the row, because the answer changes every
 * time somebody accepts — and because a checkbox that says "email 12,480
 * people" is a very different button from one that says "email nobody".
 */
export const POLICY_NOTIFY_RECIPIENT_COUNT = gql`
  query LegalPolicyNotifyRecipientCount($id: ID!) {
    policyNotifyRecipientCount(policy_doc_id: $id)
  }
`;

export const NOTIFY_POLICY_ACCEPTED_USERS = gql`
  mutation NotifyLegalPolicyAcceptedUsers($id: ID!, $summary: String) {
    notifyPolicyAcceptedUsers(policy_doc_id: $id, summary: $summary)
  }
`;

/** The by-type aggregate behind the dashboard's "Policies by Type" section. */
export interface PolicyTypeCount {
  policy_type: string;
  count: number;
}

export const POLICY_STATS_TABLE = gql`
  query LegalPolicyStatsTable($query: TableQueryInput) {
    policyStatsTable(query: $query) {
      total
      rows {
        policy_type
        count
      }
    }
  }
`;

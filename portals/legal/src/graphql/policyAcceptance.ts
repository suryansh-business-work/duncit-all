import { gql } from '@apollo/client';

export const POLICY_ACCEPTANCES_TABLE = gql`
  query LegalPolicyAcceptancesTable($query: TableQueryInput) {
    policyAcceptancesTable(query: $query) {
      total
      rows {
        id
        user_id
        user_name
        user_email
        policy_id
        policy_no
        policy_slug
        policy_title
        content_hash
        policy_updated_at
        method
        surface
        accepted_at
      }
    }
  }
`;

export type PolicyAcceptanceMethod = 'SIGNUP_FORM' | 'GOOGLE_SIGNUP' | 'ACCOUNT';

export type PolicyAcceptanceSurface = 'MWEB' | 'APP' | 'PORTAL' | 'WEBSITE' | 'UNKNOWN';

/**
 * One person accepting one policy, exactly as the row was written.
 *
 * The `policy_*` fields are the row's OWN copies, not a join: `deletePolicy` is
 * a hard delete, so the only reason this table can still read back an accepted
 * policy that Legal has since removed is that nothing here looks the policy up.
 */
export interface PolicyAcceptance {
  id: string;
  user_id: string;
  /** Resolved at read time, so a renamed account still reads correctly. */
  user_name: string;
  user_email: string;
  policy_id: string;
  /** Permanent handle, POL-000001 — copied at write time. */
  policy_no: string;
  policy_slug: string;
  policy_title: string;
  /** sha256 of the wording they actually agreed to. */
  content_hash: string;
  policy_updated_at: string;
  method: PolicyAcceptanceMethod;
  surface: PolicyAcceptanceSurface;
  accepted_at: string;
}

/**
 * The method values the server stores, in the order an acceptance can happen.
 *
 * Values only: the sentence each one reads as comes from
 * `policyAcceptanceMethodLabel`, because it is the same wording mWeb and the
 * native app show at the gate.
 */
export const POLICY_ACCEPTANCE_METHODS: PolicyAcceptanceMethod[] = [
  'SIGNUP_FORM',
  'GOOGLE_SIGNUP',
  'ACCOUNT',
];

/** One wording a policy has had. The live one comes back flagged `is_current`. */
export interface PolicyVersionRow {
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

/** The accepting account as it reads today. Null once the account is erased. */
export interface PolicyAcceptanceAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  is_deleted: boolean;
  created_at: string;
}

/**
 * Everything behind one row of the log.
 *
 * `policy` and `accepted_version` are both nullable and both meaningful: a
 * policy can be hard-deleted, and a wording can predate version history. The
 * dialog says so rather than rendering a blank panel.
 */
export interface PolicyAcceptanceDetail {
  acceptance: PolicyAcceptance;
  account: PolicyAcceptanceAccount | null;
  policy: {
    id: string;
    policy_no: string;
    title: string;
    slug: string;
    policy_type: string;
    is_active: boolean;
    version_count: number;
    content_hash: string;
    updated_at: string;
  } | null;
  accepted_version: PolicyVersionRow | null;
  versions: PolicyVersionRow[];
  policy_history: PolicyAcceptance[];
  user_acceptances: PolicyAcceptance[];
}

const ACCEPTANCE_ROW_FIELDS = `
  id
  user_id
  user_name
  user_email
  policy_id
  policy_no
  policy_slug
  policy_title
  content_hash
  policy_updated_at
  method
  surface
  accepted_at
`;

const VERSION_FIELDS = `
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
`;

export const POLICY_ACCEPTANCE_DETAIL = gql`
  query LegalPolicyAcceptanceDetail($acceptanceId: ID!) {
    policyAcceptanceDetail(acceptance_id: $acceptanceId) {
      acceptance { ${ACCEPTANCE_ROW_FIELDS} }
      account {
        id
        name
        email
        phone
        status
        is_deleted
        created_at
      }
      policy {
        id
        policy_no
        title
        slug
        policy_type
        is_active
        version_count
        content_hash
        updated_at
      }
      accepted_version { ${VERSION_FIELDS} }
      versions { ${VERSION_FIELDS} }
      policy_history { ${ACCEPTANCE_ROW_FIELDS} }
      user_acceptances { ${ACCEPTANCE_ROW_FIELDS} }
    }
  }
`;

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

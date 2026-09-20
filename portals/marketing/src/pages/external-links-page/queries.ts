import { gql } from '@apollo/client';

const POLICY_FIELDS = gql`
  fragment ShortLinkPolicyFields on ShortLinkPolicy {
    blocked_domains
    retention_days
    honour_consent_signals
    ip_salt_rotated_at
    last_purge_at
    last_purged_count
    retention_cutoff
    clicks_stored
    clicks_beyond_retention
    consent_minimised
    updated_at
  }
`;

/** What short links may point at, and what may be kept about who follows them. */
export const SHORT_LINK_POLICY = gql`
  query ShortLinkPolicy {
    shortLinkPolicy {
      ...ShortLinkPolicyFields
    }
  }
  ${POLICY_FIELDS}
`;

export const UPDATE_SHORT_LINK_POLICY = gql`
  mutation UpdateShortLinkPolicy($input: ShortLinkPolicyInput!) {
    updateShortLinkPolicy(input: $input) {
      ...ShortLinkPolicyFields
    }
  }
  ${POLICY_FIELDS}
`;

/**
 * Rotating the salt is the strongest erasure available: every address hash
 * written before it stops being comparable to anything written after.
 */
export const ROTATE_SHORT_LINK_IP_SALT = gql`
  mutation RotateShortLinkIpSalt {
    rotateShortLinkIpSalt {
      ...ShortLinkPolicyFields
    }
  }
  ${POLICY_FIELDS}
`;

/** Run the retention sweep now rather than waiting for the daily one. */
export const PURGE_SHORT_LINK_CLICKS = gql`
  mutation PurgeShortLinkClicks {
    purgeShortLinkClicks
  }
`;

export interface ShortLinkPolicy {
  blocked_domains: string[];
  retention_days: number;
  honour_consent_signals: boolean;
  ip_salt_rotated_at: string;
  last_purge_at?: string | null;
  last_purged_count: number;
  retention_cutoff: string;
  clicks_stored: number;
  clicks_beyond_retention: number;
  consent_minimised: number;
  updated_at: string;
}

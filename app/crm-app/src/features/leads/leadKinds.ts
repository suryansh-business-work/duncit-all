/**
 * The five CRM lead kinds, as the API names them (CommsLogEntity /
 * CrmEntityType). One list for the search filter, the deep links, the caller
 * directory and the call log, so they cannot disagree about what a kind is.
 */
export const LEAD_KINDS = ['VENUE_LEAD', 'HOST_LEAD', 'ECOMM_LEAD', 'CREATOR_LEAD', 'COMMUNITY_LEAD'] as const;

export type LeadKind = (typeof LEAD_KINDS)[number];

export const isLeadKind = (value: unknown): value is LeadKind =>
  typeof value === 'string' && (LEAD_KINDS as readonly string[]).includes(value);

/** The CrmAppLead query's flags: only the read for this kind runs. */
export function leadQueryFlags(kind: LeadKind) {
  return {
    venue: kind === 'VENUE_LEAD',
    host: kind === 'HOST_LEAD',
    ecomm: kind === 'ECOMM_LEAD',
    creator: kind === 'CREATOR_LEAD',
    community: kind === 'COMMUNITY_LEAD',
  };
}

/** The key the CrmAppLead query answers this kind under. */
export const LEAD_QUERY_FIELD: Record<LeadKind, 'venue' | 'host' | 'ecomm' | 'creator' | 'community'> = {
  VENUE_LEAD: 'venue',
  HOST_LEAD: 'host',
  ECOMM_LEAD: 'ecomm',
  CREATOR_LEAD: 'creator',
  COMMUNITY_LEAD: 'community',
};

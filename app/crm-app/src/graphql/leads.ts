import { gql } from '@/generated/graphql';

/** One search across every lead kind — the portal's searchCrmLeads. */
export const CrmAppLeadSearchDocument = gql(`
  query CrmAppLeadSearch($input: CrmLeadSearchInput!) {
    searchCrmLeads(input: $input) {
      total
      page
      page_size
      rows { entity_type id name city lead_status phones }
    }
  }
`);

/**
 * A lead's card, whatever its kind. Each kind is its own type on the server,
 * so the five reads sit side by side and only the one named by the flags runs.
 */
export const CrmAppLeadDocument = gql(`
  query CrmAppLead($id: ID!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) { id name: venue_name ...VenueCard }
    host: hostLead(id: $id) @include(if: $host) { id name: host_name ...HostCard }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) { id name: seller_name ...EcommCard }
    creator: creatorLead(id: $id) @include(if: $creator) { id name: creator_name ...CreatorCard }
    community: communityLead(id: $id) @include(if: $community) { id name: community_name ...CommunityCard }
  }
  fragment VenueCard on VenueLead { city lead_status priority assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } activity_log { id type summary body_text created_at is_deleted } }
  fragment HostCard on HostLead { city lead_status priority assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } activity_log { id type summary body_text created_at is_deleted } }
  fragment EcommCard on EcommLead { city lead_status priority assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } activity_log { id type summary body_text created_at is_deleted } }
  fragment CreatorCard on CreatorLead { city lead_status priority assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } activity_log { id type summary body_text created_at is_deleted } }
  fragment CommunityCard on CommunityLead { city lead_status priority assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } activity_log { id type summary body_text created_at is_deleted } }
`);

/** The CRM's own manual log (a NOTE on the lead's timeline) — same mutation as the portal. */
export const CrmAppAddNoteDocument = gql(`
  mutation CrmAppAddNote($input: ManualLogInput!) {
    addCrmManualLog(input: $input) { id type summary created_at }
  }
`);

/** Who owns a number, for the dialer preview. */
export const CrmAppPhoneLookupDocument = gql(`
  query CrmAppPhoneLookup($phone: String!) {
    crmPhoneLookup(phone: $phone) {
      phone_key
      matches { entity_type lead_id lead_name contact_name city lead_status assigned_to }
    }
  }
`);

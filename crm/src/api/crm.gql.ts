import { gql } from '@apollo/client';

const CONTACT_FIELDS = `name role mobile_number whatsapp_number email`;
const ACTIVITY_FIELDS = `type summary status target created_by created_at`;

export const VENUE_LEAD_FIELDS = `
  id venue_name venue_types venue_description capacity_min capacity_max space_type
  city area full_address landmark map_link contacts { ${CONTACT_FIELDS} }
  event_suitability available_days available_time_slots booking_notice
  pricing_models expected_charges security_deposit gst_applicable invoice_available
  amenities photos videos brochure_url lead_source assigned_to lead_status priority
  next_follow_up_date remarks activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const HOST_LEAD_FIELDS = `
  id host_name host_type organization_name city area contacts { ${CONTACT_FIELDS} }
  interests expected_audience_size frequency budget_range revenue_models need_venue need_vendor
  preferred_event_date preferred_day preferred_time_slot instagram_link community_link
  community_size previous_events_hosted past_attendees host_intent_scores
  lead_source assigned_to lead_status priority next_follow_up_date notes
  activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const CRM_LEAD_CONFIG = gql`
  query CrmLeadConfig {
    crmLeadConfig {
      venue_types space_types venue_event_suitability week_days booking_notices
      pricing_models amenities lead_sources venue_lead_statuses host_lead_statuses
      priorities host_types host_interests audience_sizes frequencies revenue_models host_intent_scores
    }
  }
`;

export const VENUE_LEADS = gql`
  query VenueLeads($filter: CrmLeadFilter) { venueLeads(filter: $filter) { ${VENUE_LEAD_FIELDS} } }
`;
export const VENUE_LEAD = gql`query VenueLead($id: ID!) { venueLead(id: $id) { ${VENUE_LEAD_FIELDS} } }`;
export const CREATE_VENUE_LEAD = gql`mutation CreateVenueLead($input: VenueLeadInput!) { createVenueLead(input: $input) { ${VENUE_LEAD_FIELDS} } }`;
export const UPDATE_VENUE_LEAD = gql`mutation UpdateVenueLead($id: ID!, $input: VenueLeadInput!) { updateVenueLead(id: $id, input: $input) { ${VENUE_LEAD_FIELDS} } }`;
export const DELETE_VENUE_LEAD = gql`mutation DeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`;

export const HOST_LEADS = gql`query HostLeads($filter: CrmLeadFilter) { hostLeads(filter: $filter) { ${HOST_LEAD_FIELDS} } }`;
export const HOST_LEAD = gql`query HostLead($id: ID!) { hostLead(id: $id) { ${HOST_LEAD_FIELDS} } }`;
export const CREATE_HOST_LEAD = gql`mutation CreateHostLead($input: HostLeadInput!) { createHostLead(input: $input) { ${HOST_LEAD_FIELDS} } }`;
export const UPDATE_HOST_LEAD = gql`mutation UpdateHostLead($id: ID!, $input: HostLeadInput!) { updateHostLead(id: $id, input: $input) { ${HOST_LEAD_FIELDS} } }`;
export const DELETE_HOST_LEAD = gql`mutation DeleteHostLead($id: ID!) { deleteHostLead(id: $id) }`;

export const EMAIL_VENUE_LEAD = gql`
  mutation EmailVenueLeadContact($id: ID!, $contact_email: String!, $subject: String!, $body: String!) {
    emailVenueLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body) { ok message provider }
  }
`;
export const CALL_VENUE_LEAD = gql`
  mutation CallVenueLeadContact($id: ID!, $contact_number: String!) {
    callVenueLeadContact(id: $id, contact_number: $contact_number) { ok message provider }
  }
`;

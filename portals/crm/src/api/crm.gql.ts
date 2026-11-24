import { gql } from '@apollo/client';
import { QUALITY_SUMMARY_FIELDS } from './leadQuality.gql';

export const CONTACT_FIELDS = `name role mobile_number whatsapp_number email`;
export const SERVICE_FIELDS = `service custom_name description`;
export const SOCIAL_LINK_FIELDS = `name url`;
export const ACTIVITY_FIELDS = `id type summary status target body_html body_text mention_user_ids created_by created_at updated_by updated_at deleted_by deleted_at is_deleted can_change`;
export const SUPER_CATEGORY_FIELDS = `id name slug icon`;
const LINKED_HOST_FIELDS = `id host_name host_type city lead_status priority`;

export const VENUE_LEAD_FIELDS = `
  id super_category_id category_ids sub_category_ids super_category { ${SUPER_CATEGORY_FIELDS} }
  venue_name venue_types venue_type_other venue_description capacity_min capacity_max space_type
  city area full_address landmark map_link contacts { ${CONTACT_FIELDS} }
  event_suitability available_days available_time_slots booking_notice
  pricing_models expected_charges security_deposit gst_applicable invoice_available
  amenities photos videos brochure_url website services_offered { ${SERVICE_FIELDS} }
  instagram_link social_links { ${SOCIAL_LINK_FIELDS} }
  linked_host_ids linked_hosts { ${LINKED_HOST_FIELDS} }
  tags logo_url dynamic_values_json
  lead_source assigned_to assigned_user_id lead_status priority
  next_follow_up_date remarks activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const HOST_LEAD_FIELDS = `
  id super_category_id category_ids sub_category_ids super_category { ${SUPER_CATEGORY_FIELDS} }
  host_name host_type organization_name city area contacts { ${CONTACT_FIELDS} }
  interests expected_audience_size frequency budget_range revenue_models need_venue need_vendor
  preferred_event_date preferred_day preferred_time_slot
  website services_offered { ${SERVICE_FIELDS} }
  instagram_link social_links { ${SOCIAL_LINK_FIELDS} } community_link
  community_size previous_events_hosted past_attendees host_intent_scores
  tags profile_photo_url dynamic_values_json
  lead_source assigned_to assigned_user_id lead_status priority next_follow_up_date notes
  activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const ECOMM_LEAD_FIELDS = `
  id super_category_id category_ids sub_category_ids super_category { ${SUPER_CATEGORY_FIELDS} }
  seller_name brand_name business_type city area contacts { ${CONTACT_FIELDS} }
  product_categories catalog_size price_range fulfilment_mode monthly_orders
  gst_number gst_applicable website instagram_link social_links { ${SOCIAL_LINK_FIELDS} } marketplace_links
  services_offered { ${SERVICE_FIELDS} }
  tags profile_photo_url dynamic_values_json
  lead_source assigned_to assigned_user_id lead_status priority next_follow_up_date notes
  activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const CRM_LEAD_CONFIG = gql`
  query CrmLeadConfig {
    crmLeadConfig {
      venue_types space_types venue_event_suitability week_days booking_notices
      pricing_models amenities lead_sources venue_lead_statuses host_lead_statuses
      priorities host_types host_interests audience_sizes frequencies revenue_models host_intent_scores
      services_offered_options
      venue_services_offered_options
      host_services_offered_options
      creator_platforms collaboration_types community_types community_platforms
    }
  }
`;

/** The matched account on a detail page: who it is, and where and when it uses Duncit. */
const MATCHED_USER_FIELDS = `matched_user { user_id full_name email phone profile_photo matched_on platforms_used last_activity_at }`;
/** What a table row needs for its Devices and Last activity columns (one batched user lookup per page). */
const MATCHED_USER_ROW_FIELDS = `matched_user { user_id matched_on platforms_used last_activity_at }`;

export const VENUE_LEADS = gql`
  query VenueLeads($filter: CrmLeadFilter) { venueLeads(filter: $filter) { ${VENUE_LEAD_FIELDS} } }
`;
export const VENUE_LEADS_TABLE = gql`
  query VenueLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) { venueLeadsTable(query: $query, near: $near) { total unplaced rows { ${VENUE_LEAD_FIELDS} is_duplicate distance_km geo_precision ${QUALITY_SUMMARY_FIELDS} ${MATCHED_USER_ROW_FIELDS} } } }
`;
export const VENUE_LEAD = gql`query VenueLead($id: ID!) { venueLead(id: $id) { ${VENUE_LEAD_FIELDS} ${MATCHED_USER_FIELDS} } }`;
export const CREATE_VENUE_LEAD = gql`mutation CreateVenueLead($input: VenueLeadInput!) { createVenueLead(input: $input) { ${VENUE_LEAD_FIELDS} } }`;
export const UPDATE_VENUE_LEAD = gql`mutation UpdateVenueLead($id: ID!, $input: VenueLeadInput!) { updateVenueLead(id: $id, input: $input) { ${VENUE_LEAD_FIELDS} } }`;
export const DELETE_VENUE_LEAD = gql`mutation DeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`;

export const HOST_LEADS = gql`query HostLeads($filter: CrmLeadFilter) { hostLeads(filter: $filter) { ${HOST_LEAD_FIELDS} } }`;
export const HOST_LEADS_TABLE = gql`
  query HostLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) { hostLeadsTable(query: $query, near: $near) { total unplaced rows { ${HOST_LEAD_FIELDS} is_duplicate distance_km geo_precision ${QUALITY_SUMMARY_FIELDS} ${MATCHED_USER_ROW_FIELDS} } } }
`;
export const HOST_LEAD = gql`query HostLead($id: ID!) { hostLead(id: $id) { ${HOST_LEAD_FIELDS} ${MATCHED_USER_FIELDS} } }`;
export const CREATE_HOST_LEAD = gql`mutation CreateHostLead($input: HostLeadInput!) { createHostLead(input: $input) { ${HOST_LEAD_FIELDS} } }`;
export const UPDATE_HOST_LEAD = gql`mutation UpdateHostLead($id: ID!, $input: HostLeadInput!) { updateHostLead(id: $id, input: $input) { ${HOST_LEAD_FIELDS} } }`;
export const DELETE_HOST_LEAD = gql`mutation DeleteHostLead($id: ID!) { deleteHostLead(id: $id) }`;

export const ECOMM_LEADS = gql`query EcommLeads($filter: CrmLeadFilter) { ecommLeads(filter: $filter) { ${ECOMM_LEAD_FIELDS} } }`;
export const ECOMM_LEADS_TABLE = gql`
  query EcommLeadsTable($query: TableQueryInput, $near: CrmLeadNearInput) { ecommLeadsTable(query: $query, near: $near) { total unplaced rows { ${ECOMM_LEAD_FIELDS} is_duplicate distance_km geo_precision ${QUALITY_SUMMARY_FIELDS} ${MATCHED_USER_ROW_FIELDS} } } }
`;
export const ECOMM_LEAD = gql`query EcommLead($id: ID!) { ecommLead(id: $id) { ${ECOMM_LEAD_FIELDS} ${MATCHED_USER_FIELDS} } }`;
export const CREATE_ECOMM_LEAD = gql`mutation CreateEcommLead($input: EcommLeadInput!) { createEcommLead(input: $input) { ${ECOMM_LEAD_FIELDS} } }`;
export const UPDATE_ECOMM_LEAD = gql`mutation UpdateEcommLead($id: ID!, $input: EcommLeadInput!) { updateEcommLead(id: $id, input: $input) { ${ECOMM_LEAD_FIELDS} } }`;
export const DELETE_ECOMM_LEAD = gql`mutation DeleteEcommLead($id: ID!) { deleteEcommLead(id: $id) }`;

export const EMAIL_VENUE_LEAD = gql`
  mutation EmailVenueLeadContact($id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailVenueLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) {
      ok message provider provider_id external_id
    }
  }
`;
export const CALL_VENUE_LEAD = gql`
  mutation CallVenueLeadContact($id: ID!, $contact_number: String!, $provider_id: ID) {
    callVenueLeadContact(id: $id, contact_number: $contact_number, provider_id: $provider_id) {
      ok message provider provider_id external_id recording_url
    }
  }
`;
export const EMAIL_HOST_LEAD = gql`
  mutation EmailHostLeadContact($id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailHostLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) {
      ok message provider provider_id external_id
    }
  }
`;
export const CALL_HOST_LEAD = gql`
  mutation CallHostLeadContact($id: ID!, $contact_number: String!, $provider_id: ID) {
    callHostLeadContact(id: $id, contact_number: $contact_number, provider_id: $provider_id) {
      ok message provider provider_id external_id recording_url
    }
  }
`;

export const EMAIL_ECOMM_LEAD = gql`
  mutation EmailEcommLeadContact($id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailEcommLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) {
      ok message provider provider_id external_id
    }
  }
`;
export const CALL_ECOMM_LEAD = gql`
  mutation CallEcommLeadContact($id: ID!, $contact_number: String!, $provider_id: ID) {
    callEcommLeadContact(id: $id, contact_number: $contact_number, provider_id: $provider_id) {
      ok message provider provider_id external_id recording_url
    }
  }
`;

export const ADD_CRM_MANUAL_LOG = gql`
  mutation AddCrmManualLog($input: ManualLogInput!) {
    addCrmManualLog(input: $input) {
      ${ACTIVITY_FIELDS}
    }
  }
`;

export const UPDATE_CRM_MANUAL_LOG = gql`
  mutation UpdateCrmManualLog($input: UpdateManualLogInput!) {
    updateCrmManualLog(input: $input) {
      ${ACTIVITY_FIELDS}
    }
  }
`;

export const DELETE_CRM_MANUAL_LOG = gql`
  mutation DeleteCrmManualLog($entity_type: CrmEntityType!, $entity_id: ID!, $log_id: ID!) {
    deleteCrmManualLog(entity_type: $entity_type, entity_id: $entity_id, log_id: $log_id) {
      ${ACTIVITY_FIELDS}
    }
  }
`;

export const SUPER_CATEGORIES = gql`
  query SuperCategories {
    categories(filter: { level: SUPER }) {
      id name slug icon is_active sort_order
    }
  }
`;

const DYNAMIC_FIELD_FIELDS = `id name label kind options { value label } multi placeholder default_value hint applies_to_venue applies_to_host applies_to_ecomm applies_to_creator applies_to_community required sort_order is_active created_at updated_at`;

export const CRM_DYNAMIC_FIELDS = gql`
  query CrmDynamicFields($entity: CrmEntityType, $include_inactive: Boolean) {
    crmDynamicFields(entity: $entity, include_inactive: $include_inactive) {
      ${DYNAMIC_FIELD_FIELDS}
    }
  }
`;
export const CREATE_CRM_DYNAMIC_FIELD = gql`
  mutation CreateCrmDynamicField($input: CrmDynamicFieldInput!) {
    createCrmDynamicField(input: $input) { ${DYNAMIC_FIELD_FIELDS} }
  }
`;
export const UPDATE_CRM_DYNAMIC_FIELD = gql`
  mutation UpdateCrmDynamicField($id: ID!, $input: CrmDynamicFieldInput!) {
    updateCrmDynamicField(id: $id, input: $input) { ${DYNAMIC_FIELD_FIELDS} }
  }
`;
export const DELETE_CRM_DYNAMIC_FIELD = gql`
  mutation DeleteCrmDynamicField($id: ID!) {
    deleteCrmDynamicField(id: $id)
  }
`;
export const REORDER_CRM_DYNAMIC_FIELDS = gql`
  mutation ReorderCrmDynamicFields($ids: [ID!]!) {
    reorderCrmDynamicFields(ids: $ids) { ${DYNAMIC_FIELD_FIELDS} }
  }
`;


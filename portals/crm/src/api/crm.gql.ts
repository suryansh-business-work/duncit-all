import { gql } from '@apollo/client';

const CONTACT_FIELDS = `name role mobile_number whatsapp_number email`;
const SERVICE_FIELDS = `service custom_name description`;
const ACTIVITY_FIELDS = `type summary status target body_html body_text created_by created_at`;
const SUPER_CATEGORY_FIELDS = `id name slug icon`;
const LINKED_HOST_FIELDS = `id host_name host_type city lead_status priority`;

export const VENUE_LEAD_FIELDS = `
  id super_category_id category_ids sub_category_ids super_category { ${SUPER_CATEGORY_FIELDS} }
  venue_name venue_types venue_type_other venue_description capacity_min capacity_max space_type
  city area full_address landmark map_link contacts { ${CONTACT_FIELDS} }
  event_suitability available_days available_time_slots booking_notice
  pricing_models expected_charges security_deposit gst_applicable invoice_available
  amenities photos videos brochure_url website services_offered { ${SERVICE_FIELDS} }
  linked_host_ids linked_hosts { ${LINKED_HOST_FIELDS} }
  tags logo_url dynamic_values_json
  lead_source assigned_to lead_status priority
  next_follow_up_date remarks activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const HOST_LEAD_FIELDS = `
  id super_category_id category_ids sub_category_ids super_category { ${SUPER_CATEGORY_FIELDS} }
  host_name host_type organization_name city area contacts { ${CONTACT_FIELDS} }
  interests expected_audience_size frequency budget_range revenue_models need_venue need_vendor
  preferred_event_date preferred_day preferred_time_slot
  website services_offered { ${SERVICE_FIELDS} }
  instagram_link community_link
  community_size previous_events_hosted past_attendees host_intent_scores
  tags profile_photo_url dynamic_values_json
  lead_source assigned_to lead_status priority next_follow_up_date notes
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
    }
  }
`;

export const VENUE_LEADS = gql`
  query VenueLeads($filter: CrmLeadFilter) { venueLeads(filter: $filter) { ${VENUE_LEAD_FIELDS} } }
`;
const MATCHED_USER_FIELDS = `matched_user { user_id full_name email phone profile_photo matched_on }`;
export const VENUE_LEAD = gql`query VenueLead($id: ID!) { venueLead(id: $id) { ${VENUE_LEAD_FIELDS} ${MATCHED_USER_FIELDS} } }`;
export const CREATE_VENUE_LEAD = gql`mutation CreateVenueLead($input: VenueLeadInput!) { createVenueLead(input: $input) { ${VENUE_LEAD_FIELDS} } }`;
export const UPDATE_VENUE_LEAD = gql`mutation UpdateVenueLead($id: ID!, $input: VenueLeadInput!) { updateVenueLead(id: $id, input: $input) { ${VENUE_LEAD_FIELDS} } }`;
export const DELETE_VENUE_LEAD = gql`mutation DeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`;

export const HOST_LEADS = gql`query HostLeads($filter: CrmLeadFilter) { hostLeads(filter: $filter) { ${HOST_LEAD_FIELDS} } }`;
export const HOST_LEAD = gql`query HostLead($id: ID!) { hostLead(id: $id) { ${HOST_LEAD_FIELDS} ${MATCHED_USER_FIELDS} } }`;
export const CREATE_HOST_LEAD = gql`mutation CreateHostLead($input: HostLeadInput!) { createHostLead(input: $input) { ${HOST_LEAD_FIELDS} } }`;
export const UPDATE_HOST_LEAD = gql`mutation UpdateHostLead($id: ID!, $input: HostLeadInput!) { updateHostLead(id: $id, input: $input) { ${HOST_LEAD_FIELDS} } }`;
export const DELETE_HOST_LEAD = gql`mutation DeleteHostLead($id: ID!) { deleteHostLead(id: $id) }`;

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

export const ADD_CRM_MANUAL_LOG = gql`
  mutation AddCrmManualLog($input: ManualLogInput!) {
    addCrmManualLog(input: $input) {
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

export const CRM_SERVICES = gql`
  query CrmServices($kind: CrmServiceKind, $include_inactive: Boolean) {
    crmServices(kind: $kind, include_inactive: $include_inactive) {
      id name kind sort_order is_active created_at updated_at
    }
  }
`;
export const CREATE_CRM_SERVICE = gql`
  mutation CreateCrmService($input: CrmServiceInput!) {
    createCrmService(input: $input) { id name kind sort_order is_active }
  }
`;
export const UPDATE_CRM_SERVICE = gql`
  mutation UpdateCrmService($id: ID!, $input: CrmServiceInput!) {
    updateCrmService(id: $id, input: $input) { id name kind sort_order is_active }
  }
`;
export const DELETE_CRM_SERVICE = gql`
  mutation DeleteCrmService($id: ID!) {
    deleteCrmService(id: $id)
  }
`;

const DYNAMIC_FIELD_FIELDS = `id name label kind options { value label } multi placeholder default_value hint applies_to_venue applies_to_host required sort_order is_active created_at updated_at`;

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

export const UPLOAD_IMAGE = gql`
  mutation CrmUploadImage($fileBase64: String!, $fileName: String!, $mimeType: String, $folder: String) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
    ) {
      url fileId thumbnailUrl
    }
  }
`;

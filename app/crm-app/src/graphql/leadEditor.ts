import { gql } from '@/generated/graphql';

/**
 * A lead's editable fields, whatever its kind — everything the shared lead
 * schemas (@duncit/forms/schemas) check, so the phone validates a saved lead
 * exactly as the portal does. Only the read for the lead's kind runs.
 */
export const CrmAppLeadEditDocument = gql(`
  query CrmAppLeadEdit($id: ID!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) {
      venue_name venue_types venue_type_other full_address capacity_min capacity_max expected_charges security_deposit map_link remarks
      ...VenueEdit
    }
    host: hostLead(id: $id) @include(if: $host) {
      host_name community_size past_attendees instagram_link community_link preferred_event_date notes
      ...HostEdit
    }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) {
      seller_name brand_name gst_number instagram_link notes
      ...EcommEdit
    }
    creator: creatorLead(id: $id) @include(if: $creator) {
      creator_name handle followers_count engagement_rate rate_card instagram_link social_links { name url } notes
      ...CreatorEdit
    }
    community: communityLead(id: $id) @include(if: $community) {
      community_name member_count community_link instagram_link social_links { name url } notes
      ...CommunityEdit
    }
  }
  fragment VenueEdit on VenueLead { id super_category_id city area website lead_status priority assigned_user_id assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } services_offered { service custom_name description } }
  fragment HostEdit on HostLead { id super_category_id city area website lead_status priority assigned_user_id assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } services_offered { service custom_name description } }
  fragment EcommEdit on EcommLead { id super_category_id city area website lead_status priority assigned_user_id assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } services_offered { service custom_name description } }
  fragment CreatorEdit on CreatorLead { id super_category_id city area website lead_status priority assigned_user_id assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } services_offered { service custom_name description } }
  fragment CommunityEdit on CommunityLead { id super_category_id city area website lead_status priority assigned_user_id assigned_to next_follow_up_date contacts { name role mobile_number whatsapp_number email } services_offered { service custom_name description } }
`);

/** What the editor's pickers offer: statuses, priorities, venue types, super categories. */
export const CrmAppLeadOptionsDocument = gql(`
  query CrmAppLeadOptions {
    crmLeadConfig { venue_types venue_lead_statuses host_lead_statuses priorities }
    categories(filter: { level: SUPER }) { id name is_active }
  }
`);

export const CrmAppAssignableUsersDocument = gql(`
  query CrmAppAssignableUsers($search: String, $limit: Int) {
    crmAssignableUsers(search: $search, limit: $limit) { id name }
  }
`);

/** Which of a lead's phones, emails or website already belong to another lead — the portal's live check. */
export const CrmAppLeadDuplicatesDocument = gql(`
  query CrmAppLeadDuplicates($input: CrmLeadDuplicateCheckInput!) {
    crmLeadDuplicates(input: $input) { field value entity_type lead_id lead_name }
  }
`);

export const CrmAppCreateVenueLeadDocument = gql(
  `mutation CrmAppCreateVenueLead($input: VenueLeadInput!) { createVenueLead(input: $input) { id } }`,
);
export const CrmAppUpdateVenueLeadDocument = gql(
  `mutation CrmAppUpdateVenueLead($id: ID!, $input: VenueLeadInput!) { updateVenueLead(id: $id, input: $input) { id } }`,
);
export const CrmAppCreateHostLeadDocument = gql(
  `mutation CrmAppCreateHostLead($input: HostLeadInput!) { createHostLead(input: $input) { id } }`,
);
export const CrmAppUpdateHostLeadDocument = gql(
  `mutation CrmAppUpdateHostLead($id: ID!, $input: HostLeadInput!) { updateHostLead(id: $id, input: $input) { id } }`,
);
export const CrmAppCreateEcommLeadDocument = gql(
  `mutation CrmAppCreateEcommLead($input: EcommLeadInput!) { createEcommLead(input: $input) { id } }`,
);
export const CrmAppUpdateEcommLeadDocument = gql(
  `mutation CrmAppUpdateEcommLead($id: ID!, $input: EcommLeadInput!) { updateEcommLead(id: $id, input: $input) { id } }`,
);
export const CrmAppCreateCreatorLeadDocument = gql(
  `mutation CrmAppCreateCreatorLead($input: CreatorLeadInput!) { createCreatorLead(input: $input) { id } }`,
);
export const CrmAppUpdateCreatorLeadDocument = gql(
  `mutation CrmAppUpdateCreatorLead($id: ID!, $input: CreatorLeadInput!) { updateCreatorLead(id: $id, input: $input) { id } }`,
);
export const CrmAppCreateCommunityLeadDocument = gql(
  `mutation CrmAppCreateCommunityLead($input: CommunityLeadInput!) { createCommunityLead(input: $input) { id } }`,
);
export const CrmAppUpdateCommunityLeadDocument = gql(
  `mutation CrmAppUpdateCommunityLead($id: ID!, $input: CommunityLeadInput!) { updateCommunityLead(id: $id, input: $input) { id } }`,
);

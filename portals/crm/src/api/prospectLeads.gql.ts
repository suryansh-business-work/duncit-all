import { gql } from '@apollo/client';
import { ACTIVITY_FIELDS, CONTACT_FIELDS, SUPER_CATEGORY_FIELDS } from './crm.gql';

/** The lead backbone both kinds share (location, contacts, tags, tracking). */
const BACKBONE_FIELDS = `
  super_category_id super_category { ${SUPER_CATEGORY_FIELDS} }
  city area contacts { ${CONTACT_FIELDS} } website instagram_link
  tags profile_photo_url dynamic_values_json
  lead_source assigned_to lead_status priority next_follow_up_date notes
  activity_log { ${ACTIVITY_FIELDS} } created_at updated_at
`;

export const CREATOR_LEAD_FIELDS = `
  id creator_name handle primary_platform niches followers_count engagement_rate
  profile_links collaboration_types rate_card
  ${BACKBONE_FIELDS}
`;

export const COMMUNITY_LEAD_FIELDS = `
  id community_name community_type platform member_count meetup_frequency community_link
  interests partnership_interests
  ${BACKBONE_FIELDS}
`;

export const CREATOR_LEADS_TABLE = gql`
  query CreatorLeadsTable($query: TableQueryInput) { creatorLeadsTable(query: $query) { total rows { ${CREATOR_LEAD_FIELDS} } } }
`;
export const CREATOR_LEAD = gql`query CreatorLead($id: ID!) { creatorLead(id: $id) { ${CREATOR_LEAD_FIELDS} } }`;
export const CREATE_CREATOR_LEAD = gql`mutation CreateCreatorLead($input: CreatorLeadInput!) { createCreatorLead(input: $input) { ${CREATOR_LEAD_FIELDS} } }`;
export const UPDATE_CREATOR_LEAD = gql`mutation UpdateCreatorLead($id: ID!, $input: CreatorLeadInput!) { updateCreatorLead(id: $id, input: $input) { ${CREATOR_LEAD_FIELDS} } }`;
export const DELETE_CREATOR_LEAD = gql`mutation DeleteCreatorLead($id: ID!) { deleteCreatorLead(id: $id) }`;

export const COMMUNITY_LEADS_TABLE = gql`
  query CommunityLeadsTable($query: TableQueryInput) { communityLeadsTable(query: $query) { total rows { ${COMMUNITY_LEAD_FIELDS} } } }
`;
export const COMMUNITY_LEAD = gql`query CommunityLead($id: ID!) { communityLead(id: $id) { ${COMMUNITY_LEAD_FIELDS} } }`;
export const CREATE_COMMUNITY_LEAD = gql`mutation CreateCommunityLead($input: CommunityLeadInput!) { createCommunityLead(input: $input) { ${COMMUNITY_LEAD_FIELDS} } }`;
export const UPDATE_COMMUNITY_LEAD = gql`mutation UpdateCommunityLead($id: ID!, $input: CommunityLeadInput!) { updateCommunityLead(id: $id, input: $input) { ${COMMUNITY_LEAD_FIELDS} } }`;
export const DELETE_COMMUNITY_LEAD = gql`mutation DeleteCommunityLead($id: ID!) { deleteCommunityLead(id: $id) }`;

/** Contact email / call for a creator or community lead (the kind travels as `entity_type`). */
export const EMAIL_CRM_LEAD = gql`
  mutation EmailCrmLeadContact($entity_type: CrmProspectEntity!, $id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailCrmLeadContact(entity_type: $entity_type, id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) {
      ok message provider provider_id external_id
    }
  }
`;
export const CALL_CRM_LEAD = gql`
  mutation CallCrmLeadContact($entity_type: CrmProspectEntity!, $id: ID!, $contact_number: String!, $provider_id: ID) {
    callCrmLeadContact(entity_type: $entity_type, id: $id, contact_number: $contact_number, provider_id: $provider_id) {
      ok message provider provider_id external_id recording_url
    }
  }
`;

import { gql } from '@/generated/graphql';

/**
 * The lead page's tabs, as the CRM portal's lead detail pages read them. Each
 * tab asks for only the fields it shows; the five kinds sit side by side and
 * only the one named by the flags runs (the same flags as CrmAppLead).
 */

/** The Overview: hero chips, the matched Duncit user, the stat tiles and the overview cards. */
export const CrmAppLeadOverviewDocument = gql(`
  query CrmAppLeadOverview($id: ID!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) { id ...LeadTabVenueOverview }
    host: hostLead(id: $id) @include(if: $host) { id ...LeadTabHostOverview }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) { id ...LeadTabEcommOverview }
    creator: creatorLead(id: $id) @include(if: $creator) { id ...LeadTabCreatorOverview }
    community: communityLead(id: $id) @include(if: $community) { id ...LeadTabCommunityOverview }
  }
  fragment LeadTabMatchedUser on CrmMatchedUser { full_name email phone matched_on platforms_used last_activity_at }
  fragment LeadTabVenueOverview on VenueLead {
    logo_url venue_types tags super_category { name } matched_user { ...LeadTabMatchedUser }
    capacity_min capacity_max space_type services_offered { service custom_name }
    expected_charges security_deposit venue_description area full_address landmark map_link
    available_days available_time_slots booking_notice event_suitability amenities
    website lead_source remarks created_at updated_at
  }
  fragment LeadTabHostOverview on HostLead {
    profile_photo_url host_type interests tags super_category { name } matched_user { ...LeadTabMatchedUser }
    expected_audience_size frequency services_offered { service custom_name }
    community_size previous_events_hosted past_attendees organization_name area community_link
    host_intent_scores website lead_source notes created_at updated_at
  }
  fragment LeadTabEcommOverview on EcommLead {
    profile_photo_url brand_name tags super_category { name } matched_user { ...LeadTabMatchedUser }
    catalog_size price_range services_offered { service custom_name } monthly_orders fulfilment_mode
    business_type product_categories area gst_number gst_applicable website instagram_link
    social_links { name url } marketplace_links lead_source notes created_at updated_at
  }
  fragment LeadTabCreatorOverview on CreatorLead {
    profile_photo_url primary_platform tags super_category { name } handle niches followers_count
    engagement_rate collaboration_types rate_card profile_links area website lead_source notes created_at updated_at
  }
  fragment LeadTabCommunityOverview on CommunityLead {
    profile_photo_url community_type platform member_count meetup_frequency community_link interests
    partnership_interests tags super_category { name } area website lead_source notes created_at updated_at
  }
`);

/** Venue › Commercial. */
export const CrmAppLeadCommercialDocument = gql(`
  query CrmAppLeadCommercial($id: ID!) {
    venueLead(id: $id) { id pricing_models expected_charges security_deposit gst_applicable invoice_available }
  }
`);

/** Host › Plans & Timeline. */
export const CrmAppLeadPlansDocument = gql(`
  query CrmAppLeadPlans($id: ID!) {
    hostLead(id: $id) {
      id budget_range revenue_models need_venue need_vendor preferred_event_date preferred_day preferred_time_slot
    }
  }
`);

/** Social: Instagram and every extra social link. */
export const CrmAppLeadSocialDocument = gql(`
  query CrmAppLeadSocial($id: ID!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) { id instagram_link social_links { name url } }
    host: hostLead(id: $id) @include(if: $host) { id instagram_link social_links { name url } }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) { id instagram_link social_links { name url } }
    creator: creatorLead(id: $id) @include(if: $creator) { id instagram_link social_links { name url } }
    community: communityLead(id: $id) @include(if: $community) { id instagram_link social_links { name url } }
  }
`);

/** Services offered, each with its description. */
export const CrmAppLeadServicesDocument = gql(`
  query CrmAppLeadServices($id: ID!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    venue: venueLead(id: $id) @include(if: $venue) { id services_offered { service custom_name description } }
    host: hostLead(id: $id) @include(if: $host) { id services_offered { service custom_name description } }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) { id services_offered { service custom_name description } }
    creator: creatorLead(id: $id) @include(if: $creator) { id services_offered { service custom_name description } }
    community: communityLead(id: $id) @include(if: $community) { id services_offered { service custom_name description } }
  }
`);

/** Custom Fields: the lead's dynamic values and the active fields defined for its kind. */
export const CrmAppLeadCustomFieldsDocument = gql(`
  query CrmAppLeadCustomFields($id: ID!, $entity: CrmEntityType!, $venue: Boolean!, $host: Boolean!, $ecomm: Boolean!, $creator: Boolean!, $community: Boolean!) {
    crmDynamicFields(entity: $entity, include_inactive: false) { id name label kind options { value label } }
    venue: venueLead(id: $id) @include(if: $venue) { id dynamic_values_json }
    host: hostLead(id: $id) @include(if: $host) { id dynamic_values_json }
    ecomm: ecommLead(id: $id) @include(if: $ecomm) { id dynamic_values_json }
    creator: creatorLead(id: $id) @include(if: $creator) { id dynamic_values_json }
    community: communityLead(id: $id) @include(if: $community) { id dynamic_values_json }
  }
`);

/** Venue › Linked Hosts. */
export const CrmAppLeadLinkedHostsDocument = gql(`
  query CrmAppLeadLinkedHosts($id: ID!) {
    venueLead(id: $id) { id linked_hosts { id host_name host_type city lead_status priority } }
  }
`);

/** The score ring under the lead's name: only the score, its band and its classification. */
export const CrmAppLeadQualityRingDocument = gql(`
  query CrmAppLeadQualityRing($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmLeadQuality(entity_type: $entity_type, lead_id: $lead_id) { result { score tone classification_label } }
  }
`);

/** Quality Score: the score, its breakdown and the evidence behind each item. */
export const CrmAppLeadQualityDocument = gql(`
  query CrmAppLeadQuality($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmLeadQuality(entity_type: $entity_type, lead_id: $lead_id) { ...LeadTabQualityDetails }
  }
  fragment LeadTabQualityDetails on CrmLeadQualityDetails {
    scored_version published_version stale scored_at
    result {
      score max_score classification_label tone qualification verification min_qualification_score
      potential_score verified_items pending_items failed_items
      gates { key name state }
      criteria {
        key name max earned status mandatory
        items { key name points earned status mandatory auto_check threshold guidance }
      }
    }
    evidence { item_key status evidence source_url notes via decided_at actor { name } }
  }
`);

/** Quality Score › History, newest first. */
export const CrmAppLeadQualityHistoryDocument = gql(`
  query CrmAppLeadQualityHistory($entity_type: CrmEntityType!, $lead_id: ID!, $limit: Int) {
    crmLeadQualityHistory(entity_type: $entity_type, lead_id: $lead_id, limit: $limit) {
      id kind trigger score_before score_after classification item_key status_before status_after
      evidence source_url via created_at actor { name }
    }
  }
`);

export const CrmAppRecalculateLeadQualityDocument = gql(`
  mutation CrmAppRecalculateLeadQuality($entity_type: CrmEntityType!, $lead_id: ID!, $external: Boolean) {
    recalculateCrmLeadQuality(entity_type: $entity_type, lead_id: $lead_id, external: $external) {
      skipped_checks
      details { ...LeadTabQualityDetails }
    }
  }
`);

export const CrmAppRecordLeadEvidenceDocument = gql(`
  mutation CrmAppRecordLeadEvidence($entity_type: CrmEntityType!, $lead_id: ID!, $decisions: [CrmLeadEvidenceDecisionInput!]!) {
    recordCrmLeadEvidence(entity_type: $entity_type, lead_id: $lead_id, decisions: $decisions) {
      skipped_checks
      details { ...LeadTabQualityDetails }
    }
  }
`);

/** Contacts: the verification status beside each email. */
export const CrmAppContactEmailStatusesDocument = gql(`
  query CrmAppContactEmailStatuses($emails: [String!]!) {
    crmEmailStatuses(emails: $emails) { email status checked_at suggestion }
  }
`);

/** Compose: the active providers of a kind (the default one first picked). */
export const CrmAppComposeProvidersDocument = gql(`
  query CrmAppComposeProviders($type: CommsProviderType!) {
    commsProviderOptions(type: $type) { id name is_default }
  }
`);

export const CrmAppComposeTemplatesDocument = gql(`
  query CrmAppComposeTemplates {
    crmEmailTemplates { template_id name subject target mjml is_active variables { key sample } attachments { url name } }
  }
`);

export const CrmAppComposeRenderDocument = gql(`
  query CrmAppComposeRender($mjml: String!, $vars: String) {
    renderCrmEmailTemplate(mjml: $mjml, vars: $vars) { html errors }
  }
`);

export const CrmAppComposeVenueEmailDocument = gql(`
  mutation CrmAppComposeVenueEmail($id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailVenueLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) { ok message }
  }
`);

export const CrmAppComposeHostEmailDocument = gql(`
  mutation CrmAppComposeHostEmail($id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailHostLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) { ok message }
  }
`);

export const CrmAppComposeEcommEmailDocument = gql(`
  mutation CrmAppComposeEcommEmail($id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailEcommLeadContact(id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) { ok message }
  }
`);

/** Creator and community leads: the kind travels as entity_type. */
export const CrmAppComposeProspectEmailDocument = gql(`
  mutation CrmAppComposeProspectEmail($entity_type: CrmProspectEntity!, $id: ID!, $contact_email: String!, $subject: String!, $body: String!, $provider_id: ID, $attachments: [CrmEmailAssetInput!]) {
    emailCrmLeadContact(entity_type: $entity_type, id: $id, contact_email: $contact_email, subject: $subject, body: $body, provider_id: $provider_id, attachments: $attachments) { ok message }
  }
`);

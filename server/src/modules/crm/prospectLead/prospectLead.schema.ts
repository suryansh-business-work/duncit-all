import gql from 'graphql-tag';

/**
 * CRM creator and community leads (Leads › Creators Leads / Community Leads).
 * The lead backbone (location, contacts, tags, dynamic fields, tracking) matches
 * the other CRM lead types; each kind adds its own profile fields.
 */
export const prospectLeadTypeDefs = gql`
  type CreatorLead {
    id: ID!
    creator_name: String!
    handle: String
    primary_platform: String
    niches: [String!]!
    followers_count: Float
    "Average engagement, in percent."
    engagement_rate: Float
    profile_links: [String!]!
    collaboration_types: [String!]!
    rate_card: String
    super_category_id: ID
    super_category: CrmSuperCategoryRef
    city: String
    area: String
    contacts: [CrmContact!]!
    website: String
    instagram_link: String
    social_links: [CrmSocialLink!]!
    services_offered: [CrmServiceOffered!]!
    tags: [String!]!
    profile_photo_url: String
    dynamic_values_json: String!
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
    "True when another lead of any kind shares one of this lead's phone numbers, emails or its website. Set on table pages (the Leads listing); null elsewhere."
    is_duplicate: Boolean
    "Kilometres from the centre of a Nearby leads search. Set only on a table page read with near; null elsewhere."
    distance_km: Float
    "How exactly the lead sits on the map: PIN (its map link), AREA or CITY (that centre). Null until a Nearby leads search places it, or when it has no known city."
    geo_precision: String
  }

  type CommunityLead {
    id: ID!
    community_name: String!
    community_type: String
    "Where the community lives (WhatsApp, Telegram, Discord, offline…)."
    platform: String
    member_count: Float
    meetup_frequency: String
    community_link: String
    interests: [String!]!
    partnership_interests: [String!]!
    super_category_id: ID
    super_category: CrmSuperCategoryRef
    city: String
    area: String
    contacts: [CrmContact!]!
    website: String
    instagram_link: String
    social_links: [CrmSocialLink!]!
    services_offered: [CrmServiceOffered!]!
    tags: [String!]!
    profile_photo_url: String
    dynamic_values_json: String!
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
    "True when another lead of any kind shares one of this lead's phone numbers, emails or its website. Set on table pages (the Leads listing); null elsewhere."
    is_duplicate: Boolean
    "Kilometres from the centre of a Nearby leads search. Set only on a table page read with near; null elsewhere."
    distance_km: Float
    "How exactly the lead sits on the map: PIN (its map link), AREA or CITY (that centre). Null until a Nearby leads search places it, or when it has no known city."
    geo_precision: String
  }

  input CreatorLeadInput {
    creator_name: String!
    handle: String
    primary_platform: String
    niches: [String!]
    followers_count: Float
    engagement_rate: Float
    profile_links: [String!]
    collaboration_types: [String!]
    rate_card: String
    super_category_id: ID
    city: String
    area: String
    contacts: [CrmContactInput!]
    website: String
    instagram_link: String
    social_links: [CrmSocialLinkInput!]
    services_offered: [CrmServiceOfferedInput!]
    tags: [String!]
    profile_photo_url: String
    dynamic_values_json: String
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String
    priority: String
    next_follow_up_date: String
    notes: String
  }

  input CommunityLeadInput {
    community_name: String!
    community_type: String
    platform: String
    member_count: Float
    meetup_frequency: String
    community_link: String
    interests: [String!]
    partnership_interests: [String!]
    super_category_id: ID
    city: String
    area: String
    contacts: [CrmContactInput!]
    website: String
    instagram_link: String
    social_links: [CrmSocialLinkInput!]
    services_offered: [CrmServiceOfferedInput!]
    tags: [String!]
    profile_photo_url: String
    dynamic_values_json: String
    lead_source: String
    "The assignee's name. Filled from assigned_user_id when one is set; older clients still send free text here."
    assigned_to: String
    "The CRM team member this lead is assigned to (crmAssignableUsers). Null when unassigned or a legacy free-text name."
    assigned_user_id: ID
    lead_status: String
    priority: String
    next_follow_up_date: String
    notes: String
  }

  "Server-side table page for the shared table engine (creatorLeadsTable)."
  type CreatorLeadTablePage {
    rows: [CreatorLead!]!
    total: Int!
    page: Int!
    page_size: Int!
    "Leads of this kind with no place on the map (no city, or one the map does not know), so a Nearby leads search cannot include them. Null outside a nearby search."
    unplaced: Int
  }

  "Server-side table page for the shared table engine (communityLeadsTable)."
  type CommunityLeadTablePage {
    rows: [CommunityLead!]!
    total: Int!
    page: Int!
    page_size: Int!
    "Leads of this kind with no place on the map (no city, or one the map does not know), so a Nearby leads search cannot include them. Null outside a nearby search."
    unplaced: Int
  }

  "Lead kinds whose contact email / call goes through the generic CRM lead mutations."
  enum CrmProspectEntity {
    CREATOR_LEAD
    COMMUNITY_LEAD
  }

  extend type Query {
    "With near, only the leads within the radius, nearest first unless another sort is picked."
    creatorLeadsTable(query: TableQueryInput, near: CrmLeadNearInput): CreatorLeadTablePage!
    creatorLead(id: ID!): CreatorLead
    "With near, only the leads within the radius, nearest first unless another sort is picked."
    communityLeadsTable(query: TableQueryInput, near: CrmLeadNearInput): CommunityLeadTablePage!
    communityLead(id: ID!): CommunityLead
  }

  extend type Mutation {
    createCreatorLead(input: CreatorLeadInput!): CreatorLead!
    updateCreatorLead(id: ID!, input: CreatorLeadInput!): CreatorLead!
    deleteCreatorLead(id: ID!): Boolean!
    createCommunityLead(input: CommunityLeadInput!): CommunityLead!
    updateCommunityLead(id: ID!, input: CommunityLeadInput!): CommunityLead!
    deleteCommunityLead(id: ID!): Boolean!
    "Email one contact of a creator or community lead; the send is logged on the lead."
    emailCrmLeadContact(
      entity_type: CrmProspectEntity!
      id: ID!
      contact_email: String!
      subject: String!
      body: String!
      provider_id: ID
      attachments: [CrmEmailAssetInput!]
    ): LeadContactActionResult!
    "Call one contact of a creator or community lead; the call is logged on the lead."
    callCrmLeadContact(entity_type: CrmProspectEntity!, id: ID!, contact_number: String!, provider_id: ID): LeadContactActionResult!
  }
`;

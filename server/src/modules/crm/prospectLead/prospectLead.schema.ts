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
    assigned_to: String
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
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
    assigned_to: String
    lead_status: String!
    priority: String!
    next_follow_up_date: String
    notes: String
    activity_log: [CrmActivity!]!
    created_at: String
    updated_at: String
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
    assigned_to: String
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
    assigned_to: String
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
  }

  "Server-side table page for the shared table engine (communityLeadsTable)."
  type CommunityLeadTablePage {
    rows: [CommunityLead!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Lead kinds whose contact email / call goes through the generic CRM lead mutations."
  enum CrmProspectEntity {
    CREATOR_LEAD
    COMMUNITY_LEAD
  }

  extend type Query {
    creatorLeadsTable(query: TableQueryInput): CreatorLeadTablePage!
    creatorLead(id: ID!): CreatorLead
    communityLeadsTable(query: TableQueryInput): CommunityLeadTablePage!
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

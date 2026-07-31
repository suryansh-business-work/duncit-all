export const marketingTypeDefs = /* GraphQL */ `
  "Email is the only campaign channel; WhatsApp campaigns were removed."
  enum MarketingCampaignChannel {
    EMAIL
  }

  enum MarketingCampaignAudience {
    ALL_USERS
    NEWSLETTER_SUBSCRIBERS
    "Everybody currently matching a saved audience list."
    AUDIENCE_LIST
  }

  enum MarketingCampaignStatus {
    DRAFT
    SCHEDULED
    SENDING
    SENT
    FAILED
  }

  enum MarketingCampaignCardType {
    POD
    CLUB
  }

  type MarketingCampaignCard {
    type: MarketingCampaignCardType
    ref_id: String
    title: String
    description: String
    image_url: String
    cta_url: String
  }

  type MarketingCampaign {
    campaign_id: ID!
    name: String!
    channel: MarketingCampaignChannel!
    audience: MarketingCampaignAudience!
    "AUDIENCE_LIST audience only — recipients are recomputed at send time."
    audience_list_id: ID
    subject: String!
    mjml: String!
    rendered_html: String
    card: MarketingCampaignCard
    scheduled_at: String
    sent_at: String
    status: MarketingCampaignStatus!
    recipient_count: Int!
    error: String
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (marketingCampaignsTable)."
  type MarketingCampaignTablePage {
    rows: [MarketingCampaign!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A placeholder a campaign may use, e.g. {{app_name}}."
  type MarketingCampaignVariable {
    name: String!
    description: String!
    "What this variable renders to right now."
    sample: String!
  }

  type MarketingCampaignPreviewCard {
    id: ID!
    type: MarketingCampaignCardType!
    title: String!
    description: String
    image_url: String
    cta_url: String
    meta: String
  }

  input MarketingCampaignInput {
    name: String!
    channel: MarketingCampaignChannel!
    audience: MarketingCampaignAudience!
    "Required when audience is AUDIENCE_LIST."
    audience_list_id: ID
    subject: String!
    mjml: String!
    card_type: MarketingCampaignCardType
    card_ref_id: ID
    scheduled_at: String
    send_now: Boolean
  }

  input MarketingCampaignPreviewInput {
    subject: String!
    mjml: String!
    card_type: MarketingCampaignCardType
    card_ref_id: ID
  }

  type MarketingCampaignRender {
    subject: String!
    html: String!
    errors: [String!]!
    detected_variables: [String!]!
  }

  """
  One targetable person. Deliberately narrower than the admin User type: a
  campaign tool has no business with payout percentages, postal addresses or
  raw birthdates, so this carries the derived age instead of the date of birth
  and omits the rest.
  """
  type AudienceMember {
    id: ID!
    full_name: String!
    email: String
    phone: String
    "Derived from the date of birth. Null when the account never supplied one."
    age: Int
    city: String
    state: String
    zone: String
    pincode: String
    country: String
    locale: String
    status: String
    roles: [String!]!
    email_verified: Boolean!
    phone_verified: Boolean!
    "True when the WhatsApp number on the account has been verified."
    whatsapp_reachable: Boolean!
    """
    Push platforms this person can currently be reached on (ANDROID / IOS /
    WEB). Empty when they have never granted push or have since logged out —
    this is reachability, not an inventory of the devices they own.
    """
    push_platforms: [String!]!
    last_login_provider: String
    last_login_at: String
    created_at: String
  }

  "Server-side table page for the shared table engine (audienceTable)."
  type AudienceTablePage {
    rows: [AudienceMember!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A category at least one person has picked as an interest."
  type AudienceInterestOption {
    id: ID!
    name: String!
  }

  "One saved criterion, in the shared table-filter shape."
  type AudienceListFilter {
    field: String!
    op: String!
    value: String
    values: [String!]!
  }

  input AudienceListFilterInput {
    field: String!
    op: String!
    value: String
    values: [String!]
  }

  """
  A saved Target Audience list. It stores the filter CRITERIA, not the people —
  opening it re-runs them, so the membership and the count are always current
  rather than a snapshot of the day it was built.
  """
  type AudienceList {
    id: ID!
    name: String!
    description: String!
    owner: String!
    owner_user_id: ID
    filters: [AudienceListFilter!]!
    search: String!
    "How many people match the criteria right now."
    member_count: Int!
    created_at: String
    updated_at: String
  }

  input AudienceListInput {
    name: String!
    description: String
    owner: String!
    "The account behind the owner name, when picked from the portal-access list."
    owner_user_id: ID
    filters: [AudienceListFilterInput!]
    search: String
  }

  "Somebody who can open the Marketing portal, and so can own a list."
  type AudienceListOwner {
    id: ID!
    name: String!
    email: String!
    "True for a SUPER_ADMIN, who reaches every portal."
    is_admin: Boolean!
  }

  "Server-side table page for the shared table engine (audienceListsTable)."
  type AudienceListTablePage {
    rows: [AudienceList!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Dropdown values for the audience filters whose options are data, not a fixed list."
  type AudienceFilterOptions {
    interests: [AudienceInterestOption!]!
    "Role keys actually held by somebody in the audience."
    roles: [String!]!
  }

  extend type Query {
    """
    The marketing Target Audience list. Soft-deleted accounts are always
    excluded. Beyond the plain field filters, three filter fields are resolved
    server-side: 'age' (translated to a date-of-birth range), 'whatsapp', and
    'push_platform' / 'interest_category' (resolved to a user-id set).
    """
    audienceTable(query: TableQueryInput): AudienceTablePage!
    "Dropdown values for the audience filters that are driven by data."
    audienceFilterOptions: AudienceFilterOptions!
    "Saved Target Audience lists."
    audienceListsTable(query: TableQueryInput): AudienceListTablePage!
    "One saved list, with its member count recomputed."
    audienceList(id: ID!): AudienceList
    "Everybody who can open this portal — the assignable owners for a list."
    audienceListOwners: [AudienceListOwner!]!
    "Every saved list, for the audience dropdowns. Each carries its live reach."
    audienceLists: [AudienceList!]!
    marketingCampaigns: [MarketingCampaign!]!
    "One campaign in full, including its rendered HTML — powers the View dialog."
    marketingCampaign(campaign_id: ID!): MarketingCampaign!
    "Every variable a campaign may use, with a live sample of its value."
    marketingCampaignVariables: [MarketingCampaignVariable!]!
    marketingCampaignsTable(query: TableQueryInput): MarketingCampaignTablePage!
    marketingCampaignPreviewCards(type: MarketingCampaignCardType!): [MarketingCampaignPreviewCard!]!
    renderMarketingCampaign(input: MarketingCampaignPreviewInput!): MarketingCampaignRender!
  }

  extend type Mutation {
    createAudienceList(input: AudienceListInput!): AudienceList!
    deleteAudienceList(id: ID!): Boolean!
    createMarketingCampaign(input: MarketingCampaignInput!): MarketingCampaign!
    sendMarketingCampaign(campaign_id: ID!): MarketingCampaign!
    """
    Delete a campaign. A scheduled one has its pending send cancelled with it;
    a campaign that is sending right now is refused.
    """
    deleteMarketingCampaign(campaign_id: ID!): Boolean!
  }
`;
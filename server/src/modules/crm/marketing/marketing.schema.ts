export const marketingTypeDefs = /* GraphQL */ `
  enum MarketingCampaignChannel {
    EMAIL
    WHATSAPP
  }

  enum MarketingCampaignAudience {
    ALL_USERS
    NEWSLETTER_SUBSCRIBERS
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
    marketingCampaigns: [MarketingCampaign!]!
    marketingCampaignsTable(query: TableQueryInput): MarketingCampaignTablePage!
    marketingCampaignPreviewCards(type: MarketingCampaignCardType!): [MarketingCampaignPreviewCard!]!
    renderMarketingCampaign(input: MarketingCampaignPreviewInput!): MarketingCampaignRender!
  }

  extend type Mutation {
    createMarketingCampaign(input: MarketingCampaignInput!): MarketingCampaign!
    sendMarketingCampaign(campaign_id: ID!): MarketingCampaign!
  }
`;
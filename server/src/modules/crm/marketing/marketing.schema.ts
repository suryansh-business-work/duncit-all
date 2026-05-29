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

  extend type Query {
    marketingCampaigns: [MarketingCampaign!]!
    marketingCampaignPreviewCards(type: MarketingCampaignCardType!): [MarketingCampaignPreviewCard!]!
    renderMarketingCampaign(input: MarketingCampaignPreviewInput!): MarketingCampaignRender!
  }

  extend type Mutation {
    createMarketingCampaign(input: MarketingCampaignInput!): MarketingCampaign!
    sendMarketingCampaign(campaign_id: ID!): MarketingCampaign!
  }
`;
export const shortLinkTypeDefs = /* GraphQL */ `
  """
  Where a link is being handed out. Becomes utm_source. OTHER carries free
  text in source_other.
  """
  enum ShortLinkSource {
    DIRECT_LINK_SHARE
    INSTAGRAM
    FACEBOOK
    THREADS
    WHATSAPP
    X_TWITTER
    LINKEDIN
    YOUTUBE
    TELEGRAM
    EMAIL
    SMS
    GOOGLE_SEARCH
    GOOGLE_ADS
    QR_CODE
    REDDIT
    DISCORD
    INFLUENCER
    AFFILIATE
    REFERRAL_PARTNER
    OTHER
  }

  "How the traffic arrives. Becomes utm_medium."
  enum ShortLinkMedium {
    SOCIAL
    ORGANIC_SOCIAL
    PAID_SOCIAL
    EMAIL
    MESSAGING
    CPC
    DISPLAY
    SEARCH
    ORGANIC_SEARCH
    REFERRAL
    AFFILIATE
    INFLUENCER
    QR_CODE
    PUSH_NOTIFICATION
    SMS
    BANNER
    VIDEO
    DISPLAY_AD
    IN_APP
    DIRECT
    OTHER
  }

  type ShortLinkOption {
    value: String!
    label: String!
    "What this option puts in the URL. Empty for OTHER, which is free text."
    utm_value: String!
    requires_text: Boolean!
  }

  type ShortLinkOptions {
    sources: [ShortLinkOption!]!
    mediums: [ShortLinkOption!]!
  }

  type ShortLink {
    id: ID!
    code: String!
    "The link you hand out, e.g. https://duncit.com/aB3xY9Zq"
    short_url: String!
    label: String!
    destination_url: String!
    "Where the code actually lands, with the utm tags and dl marker applied."
    tagged_url: String!
    source: ShortLinkSource!
    source_other: String
    medium: ShortLinkMedium!
    medium_other: String
    campaign_id: ID
    utm_source: String!
    utm_medium: String!
    utm_campaign: String
    is_active: Boolean!
    click_count: Int!
    first_clicked_at: String
    last_clicked_at: String
    created_at: String!
    updated_at: String!
  }

  type ShortLinkTablePage {
    rows: [ShortLink!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input ShortLinkInput {
    label: String!
    destination_url: String!
    source: ShortLinkSource!
    "Required when source is OTHER."
    source_other: String
    medium: ShortLinkMedium!
    "Required when medium is OTHER."
    medium_other: String
    campaign_id: ID
  }

  extend type Query {
    "The channel and medium dropdowns, so no client keeps its own copy."
    shortLinkOptions: ShortLinkOptions!
    shortLinksTable(query: TableQueryInput): ShortLinkTablePage!
    shortLink(id: ID!): ShortLink!
    "A PNG data URL of the short link, rendered server-side."
    shortLinkQr(id: ID!): String!
  }

  extend type Mutation {
    createShortLink(input: ShortLinkInput!): ShortLink!
    "Retire or revive a link without deleting its click history."
    setShortLinkActive(id: ID!, is_active: Boolean!): ShortLink!
    deleteShortLink(id: ID!): Boolean!
  }
`;

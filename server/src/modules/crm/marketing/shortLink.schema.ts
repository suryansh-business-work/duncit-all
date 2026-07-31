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

  "One row of a breakdown — a value and how many clicks carried it."
  type ShortLinkBreakdown {
    label: String!
    count: Int!
  }

  type ShortLinkDailyPoint {
    date: String!
    count: Int!
  }

  type ShortLinkStats {
    total_clicks: Int!
    "Distinct visitors, counted by hashed address."
    unique_visitors: Int!
    countries_reached: Int!
    daily: [ShortLinkDailyPoint!]!
    "Where the click came from — Instagram, WhatsApp, Direct…"
    platforms: [ShortLinkBreakdown!]!
    devices: [ShortLinkBreakdown!]!
    oses: [ShortLinkBreakdown!]!
    browsers: [ShortLinkBreakdown!]!
    countries: [ShortLinkBreakdown!]!
    cities: [ShortLinkBreakdown!]!
    referrers: [ShortLinkBreakdown!]!
  }

  "A single recorded click. Addresses are hashed on the way in, never stored."
  type ShortLinkClick {
    id: ID!
    click_id: String!
    clicked_at: String!
    platform: String!
    referrer_host: String
    device_type: String!
    os: String!
    browser: String!
    country: String
    region: String
    city: String
  }

  "How far a click got. Ordered — a later step implies the earlier ones."
  enum ShortLinkJourneyStep {
    CLICKED
    LANDED
    SIGNED_UP
    SURVEY_DONE
    VIEWED_POD
    CHECKOUT_STARTED
    PAID
  }

  type ShortLinkFunnelStep {
    step: ShortLinkJourneyStep!
    count: Int!
  }

  type ShortLinkFunnel {
    steps: [ShortLinkFunnelStep!]!
    "Revenue attributed to this link."
    revenue: Float!
    "Percentage of clicks that ended in a payment."
    conversion_rate: Float!
  }

  type ShortLinkJourneyEntry {
    step: ShortLinkJourneyStep!
    at: String!
  }

  "One click, who it turned into, and how far it got."
  type ShortLinkJourney {
    id: ID!
    click_id: String!
    clicked_at: String!
    platform: String!
    country: String
    city: String
    device_type: String!
    furthest_step: ShortLinkJourneyStep!
    converted_amount: Float
    user_id: ID
    user_name: String
    user_email: String
    steps: [ShortLinkJourneyEntry!]!
  }

  type ShortLinkJourneyTablePage {
    rows: [ShortLinkJourney!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ShortLinkClickTablePage {
    rows: [ShortLinkClick!]!
    total: Int!
    page: Int!
    page_size: Int!
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
    "Aggregated click analytics for one link."
    shortLinkStats(id: ID!): ShortLinkStats!
    "Individual clicks on one link."
    shortLinkClicks(id: ID!, query: TableQueryInput): ShortLinkClickTablePage!
    "Click -> signup -> checkout -> paid, for one link."
    shortLinkFunnel(id: ID!): ShortLinkFunnel!
    "One row per click, with the person it became and how far they got."
    shortLinkJourneys(id: ID!, query: TableQueryInput): ShortLinkJourneyTablePage!
  }

  extend type Mutation {
    """
    Report that a click reached a step. Called by the apps as the visitor moves
    through the funnel; safe to call more than once, since a step that already
    happened keeps its original time. Public: most of the funnel happens before
    anyone has signed in, and an authenticated call also binds the account.
    """
    recordShortLinkJourney(click_id: String!, step: ShortLinkJourneyStep!): Boolean!
    createShortLink(input: ShortLinkInput!): ShortLink!
    "Retire or revive a link without deleting its click history."
    setShortLinkActive(id: ID!, is_active: Boolean!): ShortLink!
    deleteShortLink(id: ID!): Boolean!
  }
`;

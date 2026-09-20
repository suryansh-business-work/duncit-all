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

  """
  What is being shared. The destination behind each one is built by the server
  from the thing itself, never taken from the request.
  """
  enum ShareLinkTarget {
    POD
    "The venue map link a shared pod message carries."
    POD_LOCATION
    "A pod's rating form, sent by its host."
    POD_FEEDBACK
    "A pod's media upload page, sent by its host to the people who came."
    POD_MEDIA
    CLUB
    PROFILE
    POST
    POD_IDEA
    GIFT_CARD
    REFERRAL
  }

  "The link a share should hand out."
  type ShareLink {
    "The duncit.com short link, or the plain destination when the link is retired."
    url: String!
    "The short code, or null when the plain destination is being handed out."
    code: String
  }

  "Where a short link's campaign comes from."
  enum ShortLinkCampaignKind {
    "Defined by the platform; what the apps file every share under."
    SHARE
    "A marketing campaign."
    EMAIL
  }

  type ShortLinkCampaign {
    campaign_id: ID!
    name: String!
    utm_campaign: String!
    kind: ShortLinkCampaignKind!
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
    """
    True when the destination is not one of our own sites or an app store.
    Derived from the host, never chosen, so it always matches where the link
    really goes.
    """
    is_external: Boolean!
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
    "Distinct visitors, counted by salted address hash."
    unique_visitors: Int!
    countries_reached: Int!
    """
    Clicks whose visitor asked not to be tracked, counted and then recorded
    with nothing that could single them out. Shown so a thin breakdown is
    explained rather than looking like data loss.
    """
    consent_minimised: Int!
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
    "GPC or DNT when this visitor asked not to be tracked, else null."
    consent_signal: String
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

  "One payment credited to a click."
  type ShortLinkConversion {
    payment_id: ID!
    amount: Float!
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
    "Everything this visitor spent, across every payment."
    converted_amount: Float
    user_id: ID
    user_name: String
    user_email: String
    steps: [ShortLinkJourneyEntry!]!
    "Every payment this click earned, oldest first."
    conversions: [ShortLinkConversion!]!
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
    "Every campaign a link can be filed under — the share campaigns and the email ones."
    shortLinkCampaigns: [ShortLinkCampaign!]!
    "The channel and medium dropdowns, so no client keeps its own copy."
    shortLinkOptions: ShortLinkOptions!
    shortLinksTable(query: TableQueryInput): ShortLinkTablePage!
    shortLink(id: ID!): ShortLink!
    "A PNG data URL of the short link, rendered server-side."
    shortLinkQr(id: ID!): String!
    """
    Aggregated click analytics for one link. The days argument narrows every number
    together; 0 or omitted means all time.
    """
    shortLinkStats(id: ID!, days: Int): ShortLinkStats!
    "Individual clicks on one link."
    shortLinkClicks(id: ID!, query: TableQueryInput): ShortLinkClickTablePage!
    "Click -> signup -> checkout -> paid, for one link."
    shortLinkFunnel(id: ID!): ShortLinkFunnel!
    "One row per click, with the person it became and how far they got."
    shortLinkJourneys(id: ID!, query: TableQueryInput): ShortLinkJourneyTablePage!
    "Destination rules and click-data retention, for the privacy console."
    shortLinkPolicy: ShortLinkPolicy!
  }

  """
  What short links are allowed to point at, and what may be kept about the
  people who follow them. One policy for every link.
  """
  type ShortLinkPolicy {
    "Hosts a link may never point at. Each entry covers its subdomains."
    blocked_domains: [String!]!
    "How long a recorded click is kept before the daily sweep deletes it."
    retention_days: Int!
    "Whether a visitor's Sec-GPC / DNT header is obeyed."
    honour_consent_signals: Boolean!
    """
    When the address-hash salt was last rotated. Every hash written before
    this is unlinkable to anything written after it.
    """
    ip_salt_rotated_at: String!
    last_purge_at: String
    last_purged_count: Int!
    "Clicks older than this are deleted by the next sweep."
    retention_cutoff: String!
    clicks_stored: Int!
    clicks_beyond_retention: Int!
    "How many stored clicks were minimised because the visitor opted out."
    consent_minimised: Int!
    updated_at: String!
  }

  input ShortLinkPolicyInput {
    "A full list, not a delta — what is sent replaces what is stored."
    blocked_domains: [String!]
    retention_days: Int
    honour_consent_signals: Boolean
  }

  extend type Mutation {
    """
    Report that a click reached a step. Called by the apps as the visitor moves
    through the funnel; safe to call more than once, since a step that already
    happened keeps its original time. Public: most of the funnel happens before
    anyone has signed in, and an authenticated call also binds the account.
    """
    recordShortLinkJourney(click_id: String!, step: ShortLinkJourneyStep!): Boolean!
    """
    The tracked link for something being shared out of mWeb or the app.
    Minted once per thing shared, under that target's campaign, and reused by
    everyone who shares it afterwards. Public: a pod is shared by signed-out
    visitors too, and the destination is built from the ref rather than sent, so
    a link can only ever point at something that already exists on Duncit.
    """
    shareLink(target: ShareLinkTarget!, ref: ID!): ShareLink!
    createShortLink(input: ShortLinkInput!): ShortLink!
    "Retire or revive a link without deleting its click history."
    setShortLinkActive(id: ID!, is_active: Boolean!): ShortLink!
    deleteShortLink(id: ID!): Boolean!
    updateShortLinkPolicy(input: ShortLinkPolicyInput!): ShortLinkPolicy!
    """
    Rotate the address-hash salt. The strongest erasure available: every hash
    written before it stops being comparable to anything after, so a visitor
    recorded yesterday can never be recognised again. Unique-visitor counts
    split across the rotation, which is the price of the guarantee.
    """
    rotateShortLinkIpSalt: ShortLinkPolicy!
    "Run the retention sweep now instead of waiting for the daily one. Returns how many clicks went."
    purgeShortLinkClicks: Int!
    "Erase every recorded click for one link. The link and its lifetime count stay."
    eraseShortLinkClicks(id: ID!): Int!
  }
`;

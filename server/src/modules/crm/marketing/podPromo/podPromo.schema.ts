import gql from 'graphql-tag';

export const podPromoTypeDefs = gql`
  """
  Where one pod promotion stands. PLANNED: claimed, nothing made yet.
  BANNER_READY: the banner and tracking link exist, the post does not.
  SCHEDULED: the post is written and waits (for its time, or for a manager on
  Approvals). PUBLISHED: it went out. SKIPPED: the pod was too close to its
  start to promote. FAILED: a step failed; error says which, and the planner
  tries again a few times. CANCELLED: the pod was cancelled or unlisted, or a
  person cancelled the promotion; its waiting post was removed.
  """
  enum PodPromoStatus {
    PLANNED
    BANNER_READY
    SCHEDULED
    PUBLISHED
    SKIPPED
    FAILED
    CANCELLED
  }

  "The banner shape: PORTRAIT is 1080x1350 (Instagram feed portrait), SQUARE is 1080x1080."
  enum PodPromoBannerStyle {
    PORTRAIT
    SQUARE
  }

  """
  The look of a pod's banner carousel. FESTIVE_BOLD: bright red and yellow,
  chunky display type. ELEGANT_SERIF: cream background, maroon serif.
  SPORT_NIGHT: dark maroon, condensed type over a darkened photo.
  PLAYFUL_PASTEL: pink, rounded type. CALM_WELLNESS: warm photo under a dark
  wash, light serif. Picked from the pod's category when not given.
  """
  enum PodBannerStyle {
    FESTIVE_BOLD
    ELEGANT_SERIF
    SPORT_NIGHT
    PLAYFUL_PASTEL
    CALM_WELLNESS
  }

  """
  One slide of the carousel, in posting order. COVER: title, date, time,
  place, price and a Book now pill. DETAILS: what the pod is and what is
  included. HOST: the host's photo, name and line (skipped without host data).
  VENUE: the venue's photo, name and address (skipped without venue data).
  BOOK: the fee, the tracking link and its QR code.
  """
  enum PodBannerSlideKind {
    COVER
    DETAILS
    HOST
    VENUE
    BOOK
  }

  type PodBannerSlide {
    kind: PodBannerSlideKind!
    "The rendered JPEG on the CDN."
    url: String!
  }

  "A carousel made for one pod: its slides in posting order."
  type PodBannerSet {
    pod_id: ID!
    style: PodBannerStyle!
    size: PodPromoBannerStyle!
    slides: [PodBannerSlide!]!
    "True when Claude wrote the slide copy; false for the built-in template."
    ai_copy: Boolean!
    "The POD_PROMO marketing run that recorded the generation, a step per slide."
    run_id: String!
  }

  "Which pods are promoted by price: every pod, only paid pods, or only free pods."
  enum PodPromoPriceFilter {
    ALL
    PAID
    FREE
  }

  "AUTO when the planner made it; MANUAL when a person pressed Promote now."
  enum PodPromoSource {
    AUTO
    MANUAL
  }

  """
  The automatic pod promotion settings (one document). Every upcoming,
  published, public pod that passes the filters gets a banner made from its
  own data and a post scheduled days_before days ahead of its start, at
  post_hour in the admin time zone, with a tracking short link to its page.
  """
  type PodPromoSettings {
    enabled: Boolean!
    "Days before the pod starts that the post goes out (1 to 30)."
    days_before: Int!
    "Hour of the day the post goes out, 0 to 23, in time_zone."
    post_hour: Int!
    "The connected social accounts the post goes to."
    account_ids: [ID!]!
    "When true, each post waits for a manager on Approvals before it goes out."
    needs_approval: Boolean!
    "Only pods in these cities (Location ids); empty means every city."
    city_ids: [ID!]!
    "Only pods of these clubs; empty means every club."
    club_ids: [ID!]!
    "Only pods whose club is in these categories (main or sub); empty means every category."
    category_ids: [ID!]!
    price_filter: PodPromoPriceFilter!
    "A pod starting sooner than this many days from now is never promoted."
    min_days_until_start: Int!
    banner_style: PodPromoBannerStyle!
    "The call to action on the banner; empty uses the default wording."
    cta_text: String!
    "utm_campaign of every tracking link is this prefix, a dash and the pod short id."
    utm_prefix: String!
    "The admin time zone post_hour is read in (Admin > Settings)."
    time_zone: String!
    "Who last saved the settings; scheduled posts are filed under this person."
    updated_by_name: String!
    updated_at: String
  }

  input PodPromoSettingsInput {
    enabled: Boolean!
    days_before: Int!
    post_hour: Int!
    account_ids: [ID!]!
    needs_approval: Boolean!
    city_ids: [ID!]!
    club_ids: [ID!]!
    category_ids: [ID!]!
    price_filter: PodPromoPriceFilter!
    min_days_until_start: Int!
    banner_style: PodPromoBannerStyle!
    cta_text: String!
    utm_prefix: String!
  }

  """
  What one promotion brought in, read from its tracking link. clicks counts
  every visit, unique_visitors distinct visitors. signups, pod_views and
  checkouts are the journey steps those visitors reached. bookings are
  visitors who joined this pod after clicking (paid and free); paid_bookings
  the ones that paid. payments and revenue (INR) are the purchases credited
  to the link by last-touch attribution within 30 days. likes, comments and
  engagement come from the published post once the network is synced.
  """
  type PodPromoFigures {
    clicks: Int!
    unique_visitors: Int!
    signups: Int!
    pod_views: Int!
    checkouts: Int!
    bookings: Int!
    paid_bookings: Int!
    payments: Int!
    revenue: Float!
    likes: Int!
    comments: Int!
    engagement: Int!
    "When these figures were last read."
    updated_at: String
  }

  "One pod promotion: its banner, caption, tracking link, scheduled post and figures."
  type PodPromo {
    id: ID!
    "The pod document id."
    pod_id: ID!
    pod_title: String!
    "When the pod starts, ISO 8601."
    pod_start: String!
    club_id: ID
    club_name: String!
    city_id: ID
    city_name: String!
    "The pod page the tracking link sends people to."
    pod_url: String!
    status: PodPromoStatus!
    source: PodPromoSource!
    "The cover slide, for thumbnails."
    banner_url: String!
    banner_style: PodPromoBannerStyle!
    style: PodBannerStyle!
    "Every slide of the carousel in posting order."
    slides: [PodBannerSlide!]!
    "Instagram usernames invited as collaborators on the post (venue and host, when they opted in)."
    collaborators: [String!]!
    caption: String!
    hashtags: [String!]!
    "True when Claude wrote the caption; false for the built-in template."
    ai_caption: Boolean!
    short_link_id: ID
    short_code: String!
    "The short link in the post, e.g. https://duncit.com/aB3xY9Zq."
    tracking_url: String!
    utm_campaign: String!
    "The post in Publishing (Calendar, Queue, Approvals)."
    scheduled_post_id: ID
    "The post's own status: DRAFT, PENDING_APPROVAL, SCHEDULED, PUBLISHING, PUBLISHED, PARTIAL or FAILED."
    post_status: String!
    "The first network link of the published post."
    permalink: String!
    scheduled_at: String
    published_at: String
    error: String!
    "The marketing run that made it."
    run_id: String!
    figures: PodPromoFigures!
    created_at: String
    updated_at: String
  }

  type PodPromoTablePage {
    rows: [PodPromo!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "A banner and caption made for a pod without scheduling anything."
  type PodPromoPreview {
    pod_id: ID!
    pod_title: String!
    banner_url: String!
    banner_style: PodPromoBannerStyle!
    style: PodBannerStyle!
    slides: [PodBannerSlide!]!
    collaborators: [String!]!
    caption: String!
    hashtags: [String!]!
    ai_caption: Boolean!
    "When the post would go out with the current settings; null when the pod is too close to promote."
    scheduled_at: String
    "Why the planner would not promote this pod on its own; empty when it would."
    ineligible_reason: String!
  }

  "An upcoming pod that can be promoted, for the pod picker."
  type PodPromoCandidate {
    id: ID!
    title: String!
    starts_at: String!
    club_name: String!
    "The status of the promotion this pod already has, if any."
    promo_status: PodPromoStatus
  }

  "Totals across every promotion."
  type PodPromoSummary {
    planned: Int!
    scheduled: Int!
    published: Int!
    failed: Int!
    clicks: Int!
    bookings: Int!
    payments: Int!
    revenue: Float!
  }

  extend type Query {
    "The automatic pod promotion settings."
    podPromoSettings: PodPromoSettings!
    """
    Every pod promotion, newest pod first. Filters: status, source, club_id,
    city_id, scheduled_at, pod_start; search matches the pod title and club.
    """
    podPromosTable(query: TableQueryInput): PodPromoTablePage!
    "One promotion, with its figures read fresh from the tracking link."
    podPromo(id: ID!): PodPromo!
    "Totals across every promotion."
    podPromoSummary: PodPromoSummary!
    "Upcoming, published, public pods to pick from, soonest first; search matches the title."
    podPromoCandidates(search: String): [PodPromoCandidate!]!
  }

  extend type Mutation {
    "Save the pod promotion settings (managers)."
    updatePodPromoSettings(input: PodPromoSettingsInput!): PodPromoSettings!
    "Render the carousel and write the caption for one pod, without scheduling a post."
    previewPodPromo(pod_id: ID!, style: PodBannerStyle, size: PodPromoBannerStyle): PodPromoPreview!
    """
    Make the banner carousel for one pod from its own data, its venue and its
    host, and upload it. Nothing is scheduled. style and size default to the
    pod's category style and the settings' banner style.
    """
    generatePodBanners(pod_id: ID!, style: PodBannerStyle, size: PodPromoBannerStyle): PodBannerSet!
    "Render one slide of a pod's carousel again."
    regeneratePodBannerSlide(
      pod_id: ID!
      kind: PodBannerSlideKind!
      style: PodBannerStyle
      size: PodPromoBannerStyle
    ): PodBannerSlide!
    """
    Promote one pod now (managers): make its tracking link, banner, caption and
    post, as the planner would. A pod whose promotion was cancelled, skipped
    or failed is promoted again; one already scheduled or published is refused.
    """
    createPodPromo(pod_id: ID!): PodPromo!
    """
    Promote one pod in one call (managers), choosing what the planner would
    otherwise decide: at (ISO 8601, defaults to the settings' slot),
    account_ids (defaults to the settings' accounts), collaborators (Instagram
    usernames, defaults to the venue and host that opted in; at most 3) and
    style (defaults to the pod's category style).
    """
    schedulePodPromo(
      pod_id: ID!
      at: String
      account_ids: [ID!]
      collaborators: [String!]
      style: PodBannerStyle
    ): PodPromo!
    "Render a fresh carousel from the pod as it is now and put it on the waiting post (managers)."
    regeneratePodPromoBanner(id: ID!, style: PodBannerStyle): PodPromo!
    "Cancel a promotion that has not gone out (managers); its waiting post is removed."
    cancelPodPromo(id: ID!): PodPromo!
  }
`;

import gql from 'graphql-tag';

export const adsTypeDefs = gql`
  enum AdMediaType {
    IMAGE
    VIDEO
  }

  "Where the ad renders in the apps. AUTO is eligible for every position."
  enum AdPosition {
    AUTO
    HOME_BOTTOM
    SIDEBAR
    EXPLORE_SCROLL
    STATUS
    VENUE_LIST
    CLUB_LIST
    POD_LIST
    POD_DETAILS
  }

  "PENDING/APPROVED/REJECTED are stored; LIVE/EXPIRED derive from the approved ad's date window."
  enum AdRequestStatus {
    PENDING
    APPROVED
    REJECTED
    LIVE
    EXPIRED
  }

  type AdRequest {
    id: ID!
    trace_id: String!
    ad_title: String!
    ad_description: String!
    ad_type: AdMediaType!
    media_url: String!
    position: AdPosition!
    start_at: String!
    duration_days: Int!
    end_at: String!
    redirect_url: String
    target_audience: String
    status: AdRequestStatus!
    marketing_remarks: String
    estimated_cost: Float!
    approved_cost: Float
    currency_symbol: String!
    submitted_by: ID!
    submitted_by_name: String!
    reviewed_at: String
    created_at: String!
    updated_at: String!
  }

  type AdRequestTablePage {
    rows: [AdRequest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Per-position per-day pricing, editable by Marketing without code changes."
  type AdPricing {
    auto_per_day: Float!
    home_bottom_per_day: Float!
    sidebar_per_day: Float!
    explore_scroll_per_day: Float!
    status_per_day: Float!
    venue_list_per_day: Float!
    club_list_per_day: Float!
    pod_list_per_day: Float!
    pod_details_per_day: Float!
    currency_symbol: String!
  }

  input UpdateAdPricingInput {
    auto_per_day: Float
    home_bottom_per_day: Float
    sidebar_per_day: Float
    explore_scroll_per_day: Float
    status_per_day: Float
    venue_list_per_day: Float
    club_list_per_day: Float
    pod_list_per_day: Float
    pod_details_per_day: Float
    currency_symbol: String
  }

  input SubmitAdRequestInput {
    ad_title: String!
    ad_description: String!
    ad_type: AdMediaType!
    media_url: String!
    position: AdPosition!
    "ISO date-time; today or later."
    start_at: String!
    "1 day to 1 month."
    duration_days: Int!
    redirect_url: String
    target_audience: String
  }

  "The lean shape the apps render in ad slots."
  type PublicAd {
    id: ID!
    ad_type: AdMediaType!
    media_url: String!
    redirect_url: String
    ad_title: String!
    position: AdPosition!
  }

  extend type Query {
    "Current per-day prices — powers the cost estimate in the Ads portal and Marketing settings."
    adPricing: AdPricing!
    "The signed-in advertiser's own requests (Ads portal)."
    myAdRequestsTable(query: TableQueryInput): AdRequestTablePage!
    "All requests, for the Marketing approval queue."
    adRequestsTable(query: TableQueryInput): AdRequestTablePage!
    "One request — owner or Marketing."
    adRequest(id: ID!): AdRequest!
    "Live ads for a placement (includes AUTO ads). Public — powers the app ad slots."
    activeAds(position: AdPosition!): [PublicAd!]!
  }

  extend type Mutation {
    "Advertiser submits a request; server quotes the cost and assigns the trace id."
    submitAdRequest(input: SubmitAdRequestInput!): AdRequest!
    "Marketing approves (freezes cost) or rejects, with remarks."
    reviewAdRequest(id: ID!, approve: Boolean!, remarks: String): AdRequest!
    "Marketing edits per-position per-day pricing."
    updateAdPricing(input: UpdateAdPricingInput!): AdPricing!
  }
`;

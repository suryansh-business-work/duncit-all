import gql from 'graphql-tag';

/** Marketing › Analytics: Overview, Social, Content & Reels, Leads & Funnel and Automation, each over one window. */
export const marketingAnalyticsTypeDefs = gql`
  "The window an analytics page reads. Days are calendar days in the admin's zone, both included."
  input MarketingAnalyticsInput {
    "The first day, yyyy-MM-dd."
    from: String!
    "The last day, yyyy-MM-dd. At most 366 days after from."
    to: String!
    "The networks to count; empty or left out means every network. Ignored by figures that have no network."
    platforms: [SocialPlatform!]
  }

  type MarketingAnalyticsWindow {
    from: String!
    to: String!
    "Every day of the window, oldest first; each per-day list is in this order."
    days: [String!]!
  }

  "A count for one code — a stage, a source, a status, a decision."
  type MarketingAnalyticsCount {
    key: String!
    count: Int!
  }

  type MarketingAnalyticsSocialDaily {
    "Total followers each day, carried forward from the last count; null before any account was counted."
    followers: [Int]!
    "Posts the networks reported as published that day."
    posts: [Int!]!
    views: [Int!]!
    engagement: [Int!]!
    "The day's average engagement per post as a percentage of that day's followers."
    engagement_rate: [Float!]!
  }

  type MarketingAnalyticsNetwork {
    platform: SocialPlatform!
    "Followers now, across the network's accounts."
    followers: Int!
    posts: Int!
    "Views (reach) the network reported; 0 where it reports none."
    views: Int!
    likes: Int!
    comments: Int!
    shares: Int!
    engagement: Int!
    "Average engagement per post as a percentage of the network's followers."
    engagement_rate: Float!
  }

  type MarketingAnalyticsAccountGrowth {
    account_id: ID!
    name: String!
    platform: SocialPlatform!
    followers: Int!
    "The last count on or before the first day, or the account's first count inside the window."
    followers_start: Int!
    "The last count on or before the last day."
    followers_end: Int!
    growth: Int!
  }

  type MarketingAnalyticsTopPost {
    id: ID!
    text: String!
    platform: SocialPlatform!
    account_name: String!
    permalink: String!
    published_at: String!
    views: Int!
    engagement: Int!
  }

  type MarketingAnalyticsSocial {
    window: MarketingAnalyticsWindow!
    followers: Int!
    "Followers gained (or lost, below 0) over the window, summed across accounts."
    follower_growth: Int!
    posts: Int!
    views: Int!
    likes: Int!
    comments: Int!
    shares: Int!
    engagement: Int!
    "Average engagement per post as a percentage of followers — the Social Accounts tab's definition."
    engagement_rate: Float!
    daily: MarketingAnalyticsSocialDaily!
    networks: [MarketingAnalyticsNetwork!]!
    accounts: [MarketingAnalyticsAccountGrowth!]!
    "The window's ten best posts by engagement."
    top_posts: [MarketingAnalyticsTopPost!]!
  }

  "How a Duncit post was made: two or more pieces of media, one clip, one picture, or none."
  enum MarketingAnalyticsPostFormat {
    CAROUSEL
    VIDEO
    SINGLE
    TEXT
  }

  type MarketingAnalyticsFormat {
    format: MarketingAnalyticsPostFormat!
    "Duncit posts of this format that went out in the window."
    posts: Int!
    "The networks those posts reached."
    networks: Int!
    views: Int!
    engagement: Int!
  }

  type MarketingAnalyticsReel {
    "The Reel Studio project id."
    id: ID!
    "Empty when the project was deleted after it was posted."
    name: String!
    networks: Int!
    views: Int!
    engagement: Int!
  }

  type MarketingAnalyticsContent {
    window: MarketingAnalyticsWindow!
    "Posts written in Duncit that went out in the window, even to only some of their networks."
    from_duncit: Int!
    "Posts the networks reported for the window, Duncit's included once synced."
    from_networks: Int!
    formats: [MarketingAnalyticsFormat!]!
    "Reel Studio projects started in the window."
    reels_made: Int!
    "Reels that went out in the window."
    reels_posted: Int!
    reel_views: Int!
    reel_engagement: Int!
    "The most viewed reels of the window, at most ten."
    top_reels: [MarketingAnalyticsReel!]!
    "Average engagement per post by weekday, Monday first, in the admin's zone."
    by_weekday: [Float!]!
    "Average engagement per post by hour of the day, 0 to 23, in the admin's zone."
    by_hour: [Float!]!
    "Index into by_weekday of the best weekday; null when nothing was posted."
    best_weekday: Int
    "The best hour of the day; null when nothing was posted."
    best_hour: Int
  }

  type MarketingAnalyticsFunnelStep {
    stage: MarketingLeadStage!
    "Leads created in the window that ever got this far."
    reached: Int!
    "Reached as a percentage of the step before; the first step is the whole cohort."
    conversion: Float!
  }

  type MarketingAnalyticsTransition {
    from: String!
    to: String!
    "Stage changes from one stage to the other made in the window."
    count: Int!
    "Their share of every change out of the same stage in the window, as a percentage."
    share: Float!
  }

  type MarketingAnalyticsStageTime {
    stage: MarketingLeadStage!
    "Stage changes out of this stage made in the window."
    moves: Int!
    "The median time a lead sat in the stage before it moved, in hours."
    median_hours: Float!
  }

  type MarketingAnalyticsFunnel {
    window: MarketingAnalyticsWindow!
    "The pipeline the figures are for; null for every pipeline."
    pipeline: MarketingLeadPipeline
    "Leads created in the window."
    new_leads: Int!
    by_source: [MarketingAnalyticsCount!]!
    "Where the window's new leads stand now."
    by_stage: [MarketingAnalyticsCount!]!
    "New leads per day."
    daily_new: [Int!]!
    funnel: [MarketingAnalyticsFunnelStep!]!
    "Leads moved to CONVERTED in the window."
    converted: Int!
    transitions: [MarketingAnalyticsTransition!]!
    time_in_stage: [MarketingAnalyticsStageTime!]!
    "Leads handed to the CRM in the window."
    promoted: Int!
    promoted_by_kind: [MarketingAnalyticsCount!]!
  }

  type MarketingAnalyticsWorkflow {
    workflow: MarketingRunWorkflow!
    runs: Int!
    completed: Int!
    partial: Int!
    failed: Int!
    "Completed as a percentage of the runs that finished (completed, partly completed or failed)."
    success_rate: Float!
    "AI tokens in and out."
    tokens: Int!
    "What the AI steps cost, in US dollars."
    cost: Float!
  }

  type MarketingAnalyticsAgent {
    agent_key: String!
    runs: Int!
    completed: Int!
    partial: Int!
    failed: Int!
    success_rate: Float!
    tokens: Int!
    cost: Float!
  }

  type MarketingAnalyticsRunDaily {
    runs: [Int!]!
    "US dollars."
    cost: [Float!]!
    tokens: [Int!]!
  }

  type MarketingAnalyticsApprovals {
    "Runs waiting on a person right now, whenever they asked."
    waiting: Int!
    "Runs decided in the window."
    decided: Int!
    by_decision: [MarketingAnalyticsCount!]!
    "The median time from a run asking to a person deciding, in minutes."
    median_decision_minutes: Float!
  }

  type MarketingAnalyticsAutomation {
    window: MarketingAnalyticsWindow!
    "Runs started in the window."
    runs: Int!
    completed: Int!
    partial: Int!
    failed: Int!
    success_rate: Float!
    tokens: Int!
    cost: Float!
    by_workflow: [MarketingAnalyticsWorkflow!]!
    by_status: [MarketingAnalyticsCount!]!
    daily: MarketingAnalyticsRunDaily!
    approvals: MarketingAnalyticsApprovals!
    agents: [MarketingAnalyticsAgent!]!
  }

  type MarketingAnalyticsOverviewSocial {
    followers: Int!
    follower_growth: Int!
    posts: Int!
    views: Int!
    engagement: Int!
    engagement_rate: Float!
  }

  type MarketingAnalyticsOverviewContent {
    from_duncit: Int!
    from_networks: Int!
    reels_made: Int!
    reels_posted: Int!
    reel_views: Int!
  }

  type MarketingAnalyticsOverviewFunnel {
    new_leads: Int!
    converted: Int!
    promoted: Int!
  }

  type MarketingAnalyticsOverviewAutomation {
    runs: Int!
    success_rate: Float!
    "US dollars."
    cost: Float!
    tokens: Int!
  }

  type MarketingAnalyticsOverviewLinks {
    clicks: Int!
    "Clicks a payment was attributed to."
    conversions: Int!
    conversion_rate: Float!
    "Attributed payments, in rupees."
    revenue: Float!
  }

  type MarketingAnalyticsOverviewDaily {
    engagement: [Int!]!
    new_leads: [Int!]!
    clicks: [Int!]!
  }

  type MarketingAnalyticsOverview {
    window: MarketingAnalyticsWindow!
    social: MarketingAnalyticsOverviewSocial!
    content: MarketingAnalyticsOverviewContent!
    funnel: MarketingAnalyticsOverviewFunnel!
    automation: MarketingAnalyticsOverviewAutomation!
    links: MarketingAnalyticsOverviewLinks!
    daily: MarketingAnalyticsOverviewDaily!
  }

  extend type Query {
    "The headline of every analytics page, and what the short links earned, for one window."
    marketingAnalyticsOverview(input: MarketingAnalyticsInput!): MarketingAnalyticsOverview!
    "Followers, posts, reach and engagement per network and per day, and the best posts."
    marketingAnalyticsSocial(input: MarketingAnalyticsInput!): MarketingAnalyticsSocial!
    "What was published from Duncit, by format; the reels and how they did; when posts do best."
    marketingAnalyticsContent(input: MarketingAnalyticsInput!): MarketingAnalyticsContent!
    "Leads by source and stage, the funnel, stage changes and time in stage, and leads promoted to the CRM."
    marketingAnalyticsFunnel(input: MarketingAnalyticsInput!, pipeline: MarketingLeadPipeline): MarketingAnalyticsFunnel!
    "Runs by workflow and outcome, AI tokens and cost, approvals and agent runs."
    marketingAnalyticsAutomation(input: MarketingAnalyticsInput!): MarketingAnalyticsAutomation!
  }
`;

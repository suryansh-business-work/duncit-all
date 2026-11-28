import gql from 'graphql-tag';

/** Marketing → Social Accounts. Enum bodies are spelled out so codegen can read them. */
export const socialTypeDefs = gql`
  "The Marketing page a finished connection lands back on: the one Connect was pressed on."
  enum SocialConnectReturn {
    ACCOUNTS
    CALENDAR
  }

  "The app a marketer connects through — one app per network. An Instagram account connected through Facebook before Instagram had its own app keeps provider FACEBOOK."
  enum SocialProvider {
    INSTAGRAM
    FACEBOOK
    THREADS
    YOUTUBE
    LINKEDIN
    X
  }

  "The network an account lives on."
  enum SocialPlatform {
    INSTAGRAM
    FACEBOOK
    THREADS
    YOUTUBE
    LINKEDIN
    X
  }

  "EXPIRED needs a person to reconnect; ERROR is retried on the next sync."
  enum SocialAccountStatus {
    CONNECTED
    EXPIRED
    ERROR
  }

  enum SocialAiStatus {
    PENDING
    CLEAN
    FLAGGED
  }

  enum SocialSentiment {
    POSITIVE
    NEUTRAL
    NEGATIVE
  }

  enum SocialSeverity {
    LOW
    MEDIUM
    HIGH
  }

  enum SocialReviewStatus {
    OPEN
    REVIEWED
  }

  "One app a network can be connected through: an active entry with both keys, set up in Tech › Environment Variables or Marketing › Settings › Integrations. Only its id and name, never a key."
  type SocialApp {
    id: ID!
    name: String!
    "The category's default app, the one a Connect without an app uses."
    is_default: Boolean!
  }

  "Whether this network has at least one app set up under Marketing › Settings › Integrations, and every app it can connect through."
  type SocialProviderStatus {
    provider: SocialProvider!
    configured: Boolean!
    "The environment category the app's entry lives in, for the settings page's link."
    category: String!
    "Every active, complete app of this network, the default first."
    apps: [SocialApp!]!
  }

  type SocialAccount {
    id: ID!
    provider: SocialProvider!
    platform: SocialPlatform!
    name: String!
    handle: String
    avatar_url: String
    profile_url: String
    followers: Int!
    status: SocialAccountStatus!
    "Why the last sync failed; empty when it did not."
    last_error: String
    last_synced_at: String
    token_expires_at: String
    "Whole days until the token lapses (0 or less: lapsed); null for a token that does not expire."
    token_expires_in_days: Int
    created_at: String
    "Comments the AI flagged that nobody has reviewed yet."
    flagged_open: Int!
    "Who answers for the account and gets its expiry reminders; defaults to whoever connected it."
    owner_user_id: ID
    owner_name: String
    "The others who look after the account."
    team_user_ids: [ID!]!
    "The daily health check: when it last ran, whether the token still worked, and what the network said when it did not."
    health_checked_at: String
    health_ok: Boolean
    health_message: String
    "The app (environment entry) the account was connected through and keeps using; null when it was connected through the default before apps could be chosen."
    app_id: ID
  }

  type SocialPost {
    id: ID!
    account_id: ID!
    account_name: String!
    platform: SocialPlatform!
    text: String
    media_url: String
    permalink: String
    published_at: String
    likes: Int!
    comments: Int!
    shares: Int!
    "Null where the network does not report views to this app."
    views: Int
    engagement: Int!
    "Engagement as a percentage of the account's followers."
    engagement_rate: Float!
    "The AI's score (0-100, 50 = the account's average); null until someone asks."
    ai_score: Int
    ai_analysis: SocialPostAnalysis
  }

  type SocialPostAnalysis {
    score: Int!
    summary: String!
    strengths: [String!]!
    improvements: [String!]!
    next_idea: String
    analyzed_at: String
  }

  "The account's usual numbers — its other recent posts, averaged."
  type SocialPostAverage {
    posts: Int!
    likes: Float!
    comments: Float!
    shares: Float!
    views: Float!
    engagement: Float!
  }

  type SocialPostDetail {
    post: SocialPost!
    average: SocialPostAverage!
    sentiment: SocialSentimentSummary!
    recent_comments: [SocialComment!]!
  }

  type SocialInsights {
    summary: String!
    what_works: [String!]!
    what_to_avoid: [String!]!
    best_times: [String!]!
    recommendations: [String!]!
  }

  type SocialPlatformEngagement {
    platform: SocialPlatform!
    posts: Int!
    engagement: Int!
  }

  type SocialTopPost {
    id: ID!
    text: String!
    platform: SocialPlatform!
    account_name: String!
    engagement: Int!
  }

  type SocialPostTablePage {
    rows: [SocialPost!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type SocialComment {
    id: ID!
    account_id: ID!
    account_name: String!
    platform: SocialPlatform!
    post_id: ID!
    post_text: String
    post_permalink: String
    permalink: String
    author_name: String
    author_handle: String
    text: String!
    published_at: String
    likes: Int!
    ai_status: SocialAiStatus!
    ai_sentiment: SocialSentiment
    ai_categories: [String!]!
    ai_severity: SocialSeverity
    ai_reason: String
    ai_analyzed_at: String
    review_status: SocialReviewStatus!
    reviewed_at: String
  }

  type SocialCommentTablePage {
    rows: [SocialComment!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type SocialSeries {
    key: String!
    values: [Int!]!
  }

  type SocialAccountEngagement {
    account_id: ID!
    name: String!
    platform: SocialPlatform!
    followers: Int!
    posts: Int!
    engagement: Int!
  }

  type SocialSentimentSummary {
    positive: Int!
    neutral: Int!
    negative: Int!
    flagged: Int!
    pending: Int!
  }

  type SocialAnalytics {
    "Every day of the period, oldest first (yyyy-MM-dd, admin time zone)."
    days: [String!]!
    followers: Int!
    posts: Int!
    likes: Int!
    comments: Int!
    shares: Int!
    views: Int!
    engagement: Int!
    "Average engagement per post as a percentage of followers."
    engagement_rate: Float!
    "Likes, comments and shares by the day a post went out."
    engagement_series: [SocialSeries!]!
    "Total followers per day; null before any account had a count."
    follower_series: [Int]!
    by_account: [SocialAccountEngagement!]!
    by_platform: [SocialPlatformEngagement!]!
    "Average engagement per post, Monday first (admin time zone)."
    by_weekday: [Float!]!
    "Average engagement per post by hour, 0-23 (admin time zone)."
    by_hour: [Float!]!
    top_posts: [SocialTopPost!]!
    sentiment: SocialSentimentSummary!
  }

  type SocialAnalysisResult {
    analyzed: Int!
    flagged: Int!
    "Why the run stopped early (OpenAI missing or failing); null when it did not."
    error: String
  }

  "One account a grant found."
  type SocialPendingAccount {
    "platform:external_id, what completeSocialConnection takes."
    key: String!
    platform: SocialPlatform!
    external_id: String!
    name: String!
    handle: String!
    avatar_url: String!
    "Already a connected account (refreshed only on a Reconnect)."
    connected: Boolean!
  }

  "What one grant found, held for the account picker."
  type SocialPendingConnection {
    id: ID!
    provider: SocialProvider!
    reconnect: Boolean!
    "Facebook Pages found."
    pages_found: Int!
    "Instagram professional accounts found (linked to those Pages)."
    instagram_found: Int!
    "Every account found, any network."
    found: Int!
    accounts: [SocialPendingAccount!]!
  }

  type SocialConnectionResult {
    provider: SocialProvider!
    "Accounts created or refreshed."
    count: Int!
  }

  input SocialAnalyticsInput {
    "Empty or missing means every connected account."
    account_ids: [ID!]
    "7, 30 or 90."
    days: Int!
  }

  extend type Query {
    socialProviders: [SocialProviderStatus!]!
    "The one redirect (callback) URL every network's app must list — shown on the settings page."
    socialRedirectUri: String!
    socialAccounts: [SocialAccount!]!
    socialAnalytics(input: SocialAnalyticsInput!): SocialAnalytics!
    socialPostsTable(query: TableQueryInput): SocialPostTablePage!
    socialCommentsTable(query: TableQueryInput): SocialCommentTablePage!
    socialPost(id: ID!): SocialPostDetail!
    "What a grant found, held for 30 minutes for the person who started it to pick from. Nothing is created until completeSocialConnection."
    socialPendingConnection(id: ID!): SocialPendingConnection!
  }

  extend type Mutation {
    "The provider's consent screen URL. The browser goes there; the provider comes back to <server>/social/callback, which sends it on to the return_to page."
    socialConnectUrl(
      provider: SocialProvider!
      return_to: SocialConnectReturn!
      "Which of the network's apps to connect through (SocialProviderStatus.apps); omitted means the default app."
      app_id: ID
      "A Reconnect: Meta asks again for permissions once declined, and the accounts already connected are refreshed."
      reconnect: Boolean
    ): String!
    "Create the ticked accounts of a held grant (SocialPendingConnection.accounts[].key); on a Reconnect the ones already connected are refreshed too. Refused with NOT_FOUND once it expired or was finished."
    completeSocialConnection(id: ID!, account_keys: [String!]!): SocialConnectionResult!
    "Read the account now instead of waiting for the scheduler."
    syncSocialAccount(id: ID!): SocialAccount!
    "Remove the account, its tokens and everything read from it; the network is asked to forget the token too."
    disconnectSocialAccount(id: ID!): Boolean!
    "Who answers for the account. A null owner clears it; every id must be a real user."
    setSocialAccountOwner(id: ID!, owner_user_id: ID, team_user_ids: [ID!]): SocialAccount!
    "Run the AI over every comment still waiting for a verdict."
    analyzeSocialComments: SocialAnalysisResult!
    reviewSocialComment(id: ID!, status: SocialReviewStatus!): SocialComment!
    "Ask the AI why this post did as it did; the answer is kept on the post."
    analyzeSocialPost(id: ID!): SocialPostDetail!
    "The AI's read of a period — not stored, so a mutation: every call is a paid AI call."
    socialInsights(input: SocialAnalyticsInput!): SocialInsights!
  }
`;

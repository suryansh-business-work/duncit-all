import { gql } from '@apollo/client';

/** One app per network; an Instagram account connected through Facebook earlier keeps provider FACEBOOK. */
export type SocialProvider = 'INSTAGRAM' | 'FACEBOOK' | 'THREADS' | 'YOUTUBE' | 'LINKEDIN' | 'X';
/** The page the OAuth callback brings the marketer back to — the one they pressed Connect on. */
export type SocialConnectReturn = 'ACCOUNTS' | 'CALENDAR';
export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'THREADS' | 'YOUTUBE' | 'LINKEDIN' | 'X';
export type SocialAccountStatus = 'CONNECTED' | 'EXPIRED' | 'ERROR';
export type SocialAiStatus = 'PENDING' | 'CLEAN' | 'FLAGGED';
export type SocialSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type SocialSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type SocialReviewStatus = 'OPEN' | 'REVIEWED';

/** One app a network can be connected through — an entry added and tested in Tech › Environment Variables or Settings › Integrations. */
export interface SocialApp {
  id: string;
  name: string;
  is_default: boolean;
}

export interface SocialProviderStatus {
  provider: SocialProvider;
  configured: boolean;
  /** The environment category the app's entry lives in — the Settings › Integrations tab to open. */
  category: string;
  /** Every app it can be connected through, the default first. */
  apps: SocialApp[];
}

export interface SocialAccount {
  id: string;
  provider: SocialProvider;
  platform: SocialPlatform;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  followers: number;
  status: SocialAccountStatus;
  last_error: string | null;
  last_synced_at: string | null;
  /** Whole days until the token lapses (0 or less: lapsed); null for a token that does not expire. */
  token_expires_in_days: number | null;
  flagged_open: number;
  /** Who answers for the account and gets its expiry reminders. */
  owner_user_id: string | null;
  owner_name: string | null;
  team_user_ids: string[];
  /** The daily health check: when it last ran and what it found. `health_ok` is null until it has. */
  health_checked_at: string | null;
  health_ok: boolean | null;
  health_message: string | null;
  /** Direct messages: the permission a reconnect would grant (null when ready), and the last DM read or webhook subscription failure. */
  messaging_missing_permission: string | null;
  dm_error: string;
  webhook_error: string;
  /** The app it was connected through and keeps using; null when connected through the default before apps could be chosen. */
  app_id: string | null;
}

export interface SocialPostRow {
  id: string;
  account_id: string;
  account_name: string;
  platform: SocialPlatform;
  text: string | null;
  media_url: string | null;
  permalink: string | null;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number | null;
  engagement: number;
  engagement_rate: number;
  ai_score: number | null;
}

export interface SocialPostAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  next_idea: string | null;
  analyzed_at: string | null;
}

export interface SocialSentimentSummary {
  positive: number;
  neutral: number;
  negative: number;
  flagged: number;
  pending: number;
}

export interface SocialPostDetail {
  post: SocialPostRow & { ai_analysis: SocialPostAnalysis | null };
  average: { posts: number; likes: number; comments: number; shares: number; views: number; engagement: number };
  sentiment: SocialSentimentSummary;
  recent_comments: SocialCommentRow[];
}

export interface SocialInsights {
  summary: string;
  what_works: string[];
  what_to_avoid: string[];
  best_times: string[];
  recommendations: string[];
}

export interface SocialCommentRow {
  id: string;
  account_id: string;
  account_name: string;
  platform: SocialPlatform;
  post_text: string | null;
  post_permalink: string | null;
  permalink: string | null;
  author_name: string | null;
  author_handle: string | null;
  text: string;
  published_at: string | null;
  likes: number;
  ai_status: SocialAiStatus;
  ai_sentiment: SocialSentiment | null;
  ai_categories: string[];
  ai_severity: SocialSeverity | null;
  ai_reason: string | null;
  review_status: SocialReviewStatus;
}

export interface SocialSeries {
  key: 'likes' | 'comments' | 'shares';
  values: number[];
}

export interface SocialAnalytics {
  days: string[];
  followers: number;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement: number;
  engagement_rate: number;
  engagement_series: SocialSeries[];
  follower_series: (number | null)[];
  by_account: { account_id: string; name: string; platform: SocialPlatform; followers: number; posts: number; engagement: number }[];
  by_platform: { platform: SocialPlatform; posts: number; engagement: number }[];
  /** Average engagement per post, Monday first. */
  by_weekday: number[];
  /** Average engagement per post by hour, 0-23. */
  by_hour: number[];
  top_posts: { id: string; text: string; platform: SocialPlatform; account_name: string; engagement: number }[];
  sentiment: SocialSentimentSummary;
}

export interface SocialAnalysisResult {
  analyzed: number;
  flagged: number;
  error: string | null;
}

const ACCOUNT_FIELDS = gql`
  fragment SocialAccountFields on SocialAccount {
    id
    provider
    platform
    name
    handle
    avatar_url
    profile_url
    followers
    status
    last_error
    last_synced_at
    token_expires_in_days
    flagged_open
    owner_user_id
    owner_name
    team_user_ids
    health_checked_at
    health_ok
    health_message
    messaging_missing_permission
    dm_error
    webhook_error
    app_id
  }
`;

/** Which networks can be connected, and every account that already is. */
export const SOCIAL_SETUP = gql`
  query SocialSetup {
    socialProviders {
      provider
      configured
      category
      apps {
        id
        name
        is_default
      }
    }
    socialAccounts {
      ...SocialAccountFields
    }
  }
  ${ACCOUNT_FIELDS}
`;

export const SOCIAL_CONNECT_URL = gql`
  mutation SocialConnectUrl($provider: SocialProvider!, $return_to: SocialConnectReturn!, $app_id: ID, $reconnect: Boolean) {
    socialConnectUrl(provider: $provider, return_to: $return_to, app_id: $app_id, reconnect: $reconnect)
  }
`;

/** One account a grant found, for the account picker (no token ever comes back). */
export interface SocialPendingAccount {
  key: string;
  platform: SocialPlatform;
  external_id: string;
  name: string;
  handle: string;
  avatar_url: string;
  /** Already connected: shown ticked and fixed; refreshed only on a Reconnect. */
  connected: boolean;
}

/** What one grant found, held on the server until the marketer ticks. */
export interface SocialPendingConnection {
  id: string;
  provider: SocialProvider;
  reconnect: boolean;
  pages_found: number;
  instagram_found: number;
  found: number;
  accounts: SocialPendingAccount[];
}

export const SOCIAL_PENDING_CONNECTION = gql`
  query SocialPendingConnection($id: ID!) {
    socialPendingConnection(id: $id) {
      id
      provider
      reconnect
      pages_found
      instagram_found
      found
      accounts {
        key
        platform
        external_id
        name
        handle
        avatar_url
        connected
      }
    }
  }
`;

export const COMPLETE_SOCIAL_CONNECTION = gql`
  mutation CompleteSocialConnection($id: ID!, $account_keys: [String!]!) {
    completeSocialConnection(id: $id, account_keys: $account_keys) {
      provider
      count
    }
  }
`;

export const SYNC_SOCIAL_ACCOUNT = gql`
  mutation SyncSocialAccount($id: ID!) {
    syncSocialAccount(id: $id) {
      ...SocialAccountFields
    }
  }
  ${ACCOUNT_FIELDS}
`;

export const DISCONNECT_SOCIAL_ACCOUNT = gql`
  mutation DisconnectSocialAccount($id: ID!) {
    disconnectSocialAccount(id: $id)
  }
`;

export const SET_SOCIAL_ACCOUNT_OWNER = gql`
  mutation SetSocialAccountOwner($id: ID!, $owner_user_id: ID, $team_user_ids: [ID!]) {
    setSocialAccountOwner(id: $id, owner_user_id: $owner_user_id, team_user_ids: $team_user_ids) {
      ...SocialAccountFields
    }
  }
  ${ACCOUNT_FIELDS}
`;

export const SOCIAL_ANALYTICS = gql`
  query SocialAnalytics($input: SocialAnalyticsInput!) {
    socialAnalytics(input: $input) {
      days
      followers
      posts
      likes
      comments
      shares
      views
      engagement
      engagement_rate
      engagement_series {
        key
        values
      }
      follower_series
      by_account {
        account_id
        name
        platform
        followers
        posts
        engagement
      }
      by_platform {
        platform
        posts
        engagement
      }
      by_weekday
      by_hour
      top_posts {
        id
        text
        platform
        account_name
        engagement
      }
      sentiment {
        positive
        neutral
        negative
        flagged
        pending
      }
    }
  }
`;

const POST_FIELDS = gql`
  fragment SocialPostFields on SocialPost {
    id
    account_id
    account_name
    platform
    text
    media_url
    permalink
    published_at
    likes
    comments
    shares
    views
    engagement
    engagement_rate
    ai_score
  }
`;

const COMMENT_FIELDS = gql`
  fragment SocialCommentFields on SocialComment {
    id
    account_id
    account_name
    platform
    post_text
    post_permalink
    permalink
    author_name
    author_handle
    text
    published_at
    likes
    ai_status
    ai_sentiment
    ai_categories
    ai_severity
    ai_reason
    review_status
  }
`;

export const SOCIAL_POSTS_TABLE = gql`
  query SocialPostsTable($query: TableQueryInput) {
    socialPostsTable(query: $query) {
      total
      rows {
        ...SocialPostFields
      }
    }
  }
  ${POST_FIELDS}
`;

export const SOCIAL_COMMENTS_TABLE = gql`
  query SocialCommentsTable($query: TableQueryInput) {
    socialCommentsTable(query: $query) {
      total
      rows {
        ...SocialCommentFields
      }
    }
  }
  ${COMMENT_FIELDS}
`;

const POST_DETAIL_FIELDS = gql`
  fragment SocialPostDetailFields on SocialPostDetail {
    post {
      ...SocialPostFields
      ai_analysis {
        score
        summary
        strengths
        improvements
        next_idea
        analyzed_at
      }
    }
    average {
      posts
      likes
      comments
      shares
      views
      engagement
    }
    sentiment {
      positive
      neutral
      negative
      flagged
      pending
    }
    recent_comments {
      ...SocialCommentFields
    }
  }
  ${POST_FIELDS}
  ${COMMENT_FIELDS}
`;

/** One post with what it is judged against. */
export const SOCIAL_POST = gql`
  query SocialPost($id: ID!) {
    socialPost(id: $id) {
      ...SocialPostDetailFields
    }
  }
  ${POST_DETAIL_FIELDS}
`;

export const ANALYZE_SOCIAL_POST = gql`
  mutation AnalyzeSocialPost($id: ID!) {
    analyzeSocialPost(id: $id) {
      ...SocialPostDetailFields
    }
  }
  ${POST_DETAIL_FIELDS}
`;

export const SOCIAL_INSIGHTS = gql`
  mutation SocialInsights($input: SocialAnalyticsInput!) {
    socialInsights(input: $input) {
      summary
      what_works
      what_to_avoid
      best_times
      recommendations
    }
  }
`;

export const ANALYZE_SOCIAL_COMMENTS = gql`
  mutation AnalyzeSocialComments {
    analyzeSocialComments {
      analyzed
      flagged
      error
    }
  }
`;

export const REVIEW_SOCIAL_COMMENT = gql`
  mutation ReviewSocialComment($id: ID!, $status: SocialReviewStatus!) {
    reviewSocialComment(id: $id, status: $status) {
      id
      review_status
    }
  }
`;

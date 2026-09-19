import { gql } from '@apollo/client';

export type SocialProvider = 'LINKEDIN' | 'META' | 'X' | 'YOUTUBE';
export type SocialPlatform = 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'X' | 'YOUTUBE';
export type SocialAccountStatus = 'CONNECTED' | 'EXPIRED' | 'ERROR';
export type SocialAiStatus = 'PENDING' | 'CLEAN' | 'FLAGGED';
export type SocialSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type SocialSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type SocialReviewStatus = 'OPEN' | 'REVIEWED';

export interface SocialProviderStatus {
  provider: SocialProvider;
  configured: boolean;
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
  flagged_open: number;
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
    flagged_open
  }
`;

/** Which networks can be connected, and every account that already is. */
export const SOCIAL_SETUP = gql`
  query SocialSetup {
    socialProviders {
      provider
      configured
    }
    socialAccounts {
      ...SocialAccountFields
    }
  }
  ${ACCOUNT_FIELDS}
`;

export const SOCIAL_CONNECT_URL = gql`
  mutation SocialConnectUrl($provider: SocialProvider!) {
    socialConnectUrl(provider: $provider)
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

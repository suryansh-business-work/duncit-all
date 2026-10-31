import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  DISCONNECT_SOCIAL_ACCOUNT,
  SET_SOCIAL_ACCOUNT_OWNER,
  SOCIAL_CONNECT_URL,
  SOCIAL_INSIGHTS,
  SYNC_SOCIAL_ACCOUNT,
  type SocialAccount,
  type SocialAnalytics,
  type SocialConnectReturn,
  type SocialInsights,
  type SocialProvider,
} from '../../src/pages/social-accounts-page/queries';
import {
  SOCIAL_CALENDAR,
  SOCIAL_SCHEDULED_POST,
  SOCIAL_SCHEDULED_POSTS,
  type SocialCalendarItem,
  type SocialPublishTarget,
  type SocialQueueView,
  type SocialScheduledPost,
} from '../../src/pages/social-accounts-page/publish.queries';

export const makeSocialAccount = (over: Partial<SocialAccount> = {}): SocialAccount => ({
  id: 'sa1',
  provider: 'LINKEDIN',
  platform: 'LINKEDIN',
  name: 'Duncit Pages',
  handle: '@duncit',
  avatar_url: null,
  profile_url: null,
  followers: 1200,
  status: 'CONNECTED',
  last_error: null,
  last_synced_at: null,
  token_expires_in_days: null,
  flagged_open: 0,
  owner_user_id: null,
  owner_name: null,
  team_user_ids: [],
  health_checked_at: null,
  health_ok: null,
  health_message: null,
  ...over,
});

type OwnerVariables = { id: string; owner_user_id: string | null; team_user_ids: string[] };

export const setSocialAccountOwnerMock = (variables: OwnerVariables, account: SocialAccount): MockedResponse => ({
  request: { query: SET_SOCIAL_ACCOUNT_OWNER, variables },
  result: { data: { setSocialAccountOwner: { __typename: 'SocialAccount', ...account } } },
});

export const setSocialAccountOwnerErrorMock = (variables: OwnerVariables, message: string): MockedResponse => ({
  request: { query: SET_SOCIAL_ACCOUNT_OWNER, variables },
  ...socialRejection(message),
});

const socialRejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const socialConnectUrlMock = (
  provider: SocialProvider,
  returnTo: SocialConnectReturn,
  url: string | null,
): MockedResponse => ({
  request: { query: SOCIAL_CONNECT_URL, variables: { provider, return_to: returnTo } },
  result: { data: { socialConnectUrl: url } },
});

export const socialConnectUrlErrorMock = (
  provider: SocialProvider,
  returnTo: SocialConnectReturn,
  message: string,
): MockedResponse => ({
  request: { query: SOCIAL_CONNECT_URL, variables: { provider, return_to: returnTo } },
  ...socialRejection(message),
});

export const syncSocialAccountMock = (account: SocialAccount): MockedResponse => ({
  request: { query: SYNC_SOCIAL_ACCOUNT, variables: { id: account.id } },
  result: { data: { syncSocialAccount: { __typename: 'SocialAccount', ...account } } },
});

export const syncSocialAccountErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: SYNC_SOCIAL_ACCOUNT, variables: { id } },
  ...socialRejection(message),
});

export const disconnectSocialAccountMock = (id: string): MockedResponse => ({
  request: { query: DISCONNECT_SOCIAL_ACCOUNT, variables: { id } },
  result: { data: { disconnectSocialAccount: true } },
});

export const disconnectSocialAccountErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: DISCONNECT_SOCIAL_ACCOUNT, variables: { id } },
  ...socialRejection(message),
});

export const makeSocialInsights = (over: Partial<SocialInsights> = {}): SocialInsights => ({
  summary: 'Reels on weekends lifted engagement.',
  what_works: ['Short reels'],
  what_to_avoid: ['Link-only posts'],
  best_times: ['Saturday 7pm'],
  recommendations: ['Post two reels a week'],
  ...over,
});

type SocialInsightsInput = { account_ids: string[] | null; days: number };

export const socialInsightsMock = (input: SocialInsightsInput, insights: SocialInsights): MockedResponse => ({
  request: { query: SOCIAL_INSIGHTS, variables: { input } },
  result: { data: { socialInsights: { __typename: 'SocialInsights', ...insights } } },
});

export const socialInsightsErrorMock = (input: SocialInsightsInput, message: string): MockedResponse => ({
  request: { query: SOCIAL_INSIGHTS, variables: { input } },
  ...socialRejection(message),
});

export const makeSocialAnalytics = (over: Partial<SocialAnalytics> = {}): SocialAnalytics => ({
  days: ['2026-09-01', '2026-09-02'],
  followers: 300,
  posts: 4,
  likes: 40,
  comments: 12,
  shares: 3,
  views: 900,
  engagement: 55,
  engagement_rate: 0.06,
  engagement_series: [
    { key: 'likes', values: [10, 30] },
    { key: 'comments', values: [5, 7] },
    { key: 'shares', values: [1, 2] },
  ],
  follower_series: [100, null],
  by_account: [
    { account_id: 'a1', name: 'Small Page', platform: 'FACEBOOK', followers: 10, posts: 1, engagement: 5 },
    { account_id: 'a2', name: 'Big Page', platform: 'INSTAGRAM', followers: 290, posts: 3, engagement: 50 },
  ],
  by_platform: [],
  by_weekday: [],
  by_hour: [],
  top_posts: [],
  sentiment: { positive: 6, neutral: 4, negative: 2, flagged: 1, pending: 0 },
  ...over,
});

// --- Publishing: posts written in Duncit, and the calendar ----------------------

export const makeSocialPublishTarget = (over: Partial<SocialPublishTarget> = {}): SocialPublishTarget => ({
  account_id: 'sa1',
  account_name: 'Duncit Pages',
  platform: 'LINKEDIN',
  status: 'PENDING',
  permalink: null,
  error: null,
  published_at: null,
  ...over,
});

/** A scheduled post with no media; pass `media` (and the matching `media_url`) for a carousel. */
export const makeSocialScheduledPost = (over: Partial<SocialScheduledPost> = {}): SocialScheduledPost => ({
  id: 'sp1',
  text: 'Run club this Sunday',
  media_url: null,
  media_type: null,
  media: [],
  status: 'SCHEDULED',
  scheduled_at: '2026-09-20T10:00:00.000Z',
  published_at: null,
  idea_id: null,
  needs_approval: false,
  review_note: null,
  approval_run_id: null,
  targets: [makeSocialPublishTarget()],
  ...over,
});

/** The post as the server returns it: `__typename` on it, its media rows and its targets. */
export const gqlSocialScheduledPost = (post: SocialScheduledPost) => ({
  __typename: 'SocialScheduledPost',
  ...post,
  media: post.media.map((item) => ({ __typename: 'SocialPostMedia', ...item })),
  targets: post.targets.map((target) => ({ __typename: 'SocialPublishTarget', ...target })),
});

export const socialScheduledPostsMock = (view: SocialQueueView, posts: SocialScheduledPost[]): MockedResponse => ({
  request: { query: SOCIAL_SCHEDULED_POSTS, variables: { view } },
  result: { data: { socialScheduledPosts: posts.map(gqlSocialScheduledPost) } },
});

export const socialScheduledPostMock = (post: SocialScheduledPost): MockedResponse => ({
  request: { query: SOCIAL_SCHEDULED_POST, variables: { id: post.id } },
  result: { data: { socialScheduledPost: gqlSocialScheduledPost(post) } },
});

export const makeSocialCalendarItem = (over: Partial<SocialCalendarItem> = {}): SocialCalendarItem => ({
  id: 'c1',
  kind: 'PLANNED',
  at: '2026-09-17T10:00:00.000Z',
  status: 'SCHEDULED',
  text: 'Run club recap',
  media_url: null,
  media_count: 0,
  permalink: null,
  platforms: ['LINKEDIN'],
  account_names: ['Duncit Pages'],
  engagement: null,
  ...over,
});

/** The calendar query for exactly the range the view asks for (see `gridRange`). */
export const socialCalendarMock = (range: { from: string; to: string }, items: SocialCalendarItem[]): MockedResponse => ({
  request: { query: SOCIAL_CALENDAR, variables: range },
  result: { data: { socialCalendar: items.map((item) => ({ __typename: 'SocialCalendarItem', ...item })) } },
});

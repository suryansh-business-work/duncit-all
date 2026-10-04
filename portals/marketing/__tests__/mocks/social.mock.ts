import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  DISCONNECT_SOCIAL_ACCOUNT,
  SOCIAL_CONNECT_URL,
  SOCIAL_INSIGHTS,
  SYNC_SOCIAL_ACCOUNT,
  type SocialAccount,
  type SocialAnalytics,
  type SocialConnectReturn,
  type SocialInsights,
  type SocialProvider,
} from '../../src/pages/social-accounts-page/queries';

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
  flagged_open: 0,
  ...over,
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

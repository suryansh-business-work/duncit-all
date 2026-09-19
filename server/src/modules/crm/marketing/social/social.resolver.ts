import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { socialService } from './social.service';
import type { SocialAnalyticsInput } from './social.analytics';
import type { SocialProvider, SocialReviewStatus } from './social.types';

/** Same gate as the rest of the marketing console. */
const ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;

export const socialResolvers = {
  Query: {
    socialProviders: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.providers();
    },
    socialAccounts: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.accounts();
    },
    socialAnalytics: (_p: unknown, args: { input: SocialAnalyticsInput }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.analytics(args.input);
    },
    socialPostsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.postsTable(args.query);
    },
    socialCommentsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.commentsTable(args.query);
    },
    socialPost: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.postDetail(args.id);
    },
  },
  Mutation: {
    socialConnectUrl: (_p: unknown, args: { provider: SocialProvider }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return socialService.connectUrl(args.provider, user.id);
    },
    syncSocialAccount: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.sync(args.id);
    },
    disconnectSocialAccount: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.disconnect(args.id);
    },
    analyzeSocialComments: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.analyze();
    },
    reviewSocialComment: (_p: unknown, args: { id: string; status: SocialReviewStatus }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return socialService.review(args.id, args.status, user.id);
    },
    analyzeSocialPost: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.analyzePost(args.id);
    },
    socialInsights: (_p: unknown, args: { input: SocialAnalyticsInput }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialService.insights(args.input);
    },
  },
};

import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { MarketingLeadPipeline } from '../leads/marketingLead.types';
import { marketingAnalyticsService } from './marketingAnalytics.service';
import type { MarketingAnalyticsInput } from './marketingAnalytics.window';

/** Reading results is every marketing seat's work, a reader's included. */
const READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR', 'MARKETING_READER'];

type Args = { input: MarketingAnalyticsInput };

export const marketingAnalyticsResolvers = {
  Query: {
    marketingAnalyticsOverview: (_p: unknown, args: Args, ctx: GraphQLContext) => {
      requireRole(ctx, READ);
      return marketingAnalyticsService.overview(args.input);
    },
    marketingAnalyticsSocial: (_p: unknown, args: Args, ctx: GraphQLContext) => {
      requireRole(ctx, READ);
      return marketingAnalyticsService.social(args.input);
    },
    marketingAnalyticsContent: (_p: unknown, args: Args, ctx: GraphQLContext) => {
      requireRole(ctx, READ);
      return marketingAnalyticsService.content(args.input);
    },
    marketingAnalyticsFunnel: (_p: unknown, args: Args & { pipeline?: MarketingLeadPipeline | null }, ctx: GraphQLContext) => {
      requireRole(ctx, READ);
      return marketingAnalyticsService.funnel(args.input, args.pipeline);
    },
    marketingAnalyticsAutomation: (_p: unknown, args: Args, ctx: GraphQLContext) => {
      requireRole(ctx, READ);
      return marketingAnalyticsService.automation(args.input);
    },
  },
};

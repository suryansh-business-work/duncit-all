import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TrackedWebsite } from './googleAnalytics.model';
import { googleAnalyticsService, type GoogleAnalyticsSiteInput } from './googleAnalytics.service';

// The Tech seats. A tag decides where every website's traffic is reported, so
// nobody else sets one.
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const googleAnalyticsResolvers = {
  Query: {
    googleAnalyticsSites: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return googleAnalyticsService.list();
    },
    // Public on purpose: a signed-out visitor's page load is what asks for it.
    googleAnalyticsTag: (_p: unknown, args: { site: TrackedWebsite }) => googleAnalyticsService.tag(args.site),
  },
  Mutation: {
    saveGoogleAnalyticsSite: (_p: unknown, args: { input: GoogleAnalyticsSiteInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return googleAnalyticsService.save(args.input, user.id);
    },
    deleteGoogleAnalyticsSite: (_p: unknown, args: { site: TrackedWebsite }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return googleAnalyticsService.remove(args.site, user.id);
    },
  },
};

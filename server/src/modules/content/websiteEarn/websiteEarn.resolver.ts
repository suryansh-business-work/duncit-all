import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import type { EarnSite } from './websiteEarn.model';
import { websiteEarnService } from './websiteEarn.service';
import { websiteEarnSectionInputSchema } from './websiteEarn.validator';

// The Website portal seats — the same ones that manage reels and navigation.
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];

export const websiteEarnResolvers = {
  Query: {
    // Public — a signed-out visitor's home page load is what asks for it.
    publicWebsiteEarnSection: (_p: unknown, args: { site: EarnSite }) => websiteEarnService.pub(args.site),
    websiteEarnSections: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteEarnService.list();
    },
  },
  Mutation: {
    saveWebsiteEarnSection: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      const data = await validate(websiteEarnSectionInputSchema, args.input);
      return websiteEarnService.save(data, String(user.id));
    },
  },
};

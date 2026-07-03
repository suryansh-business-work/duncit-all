import { websiteNavService } from './websiteNav.service';
import { websiteNavItemInputSchema } from './websiteNav.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];

export const websiteNavResolvers = {
  Query: {
    // Public — the static sites bake navigation in at build time.
    publicWebsiteNav: async (_p: unknown, args: { site: any }) =>
      websiteNavService.publicList(args.site),
    websiteNav: async (_p: unknown, args: { site?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteNavService.list(args.site ?? null);
    },
  },
  Mutation: {
    createWebsiteNavItem: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      const data = await validate(websiteNavItemInputSchema, args.input);
      return websiteNavService.create(data);
    },
    updateWebsiteNavItem: async (
      _p: unknown,
      args: { item_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      const data = await validate(websiteNavItemInputSchema, args.input);
      return websiteNavService.update(args.item_id, data);
    },
    deleteWebsiteNavItem: async (_p: unknown, args: { item_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return websiteNavService.remove(args.item_id);
    },
  },
};

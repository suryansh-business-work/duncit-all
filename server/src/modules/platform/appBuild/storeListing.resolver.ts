import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { appStoreCategories, getStoreListing, pubStoreListing, updateStoreListing } from './storeListing.service';

// The listing feeds the store pushes, which are a Tech-portal capability.
const LISTING_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const storeListingResolvers = {
  Query: {
    storeListing: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LISTING_MANAGE);
      return pubStoreListing(await getStoreListing());
    },
    appStoreCategories: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LISTING_MANAGE);
      return appStoreCategories();
    },
  },
  Mutation: {
    updateStoreListing: async (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, LISTING_MANAGE);
      return pubStoreListing(await updateStoreListing(args.input, user.email ?? user.id));
    },
  },
};

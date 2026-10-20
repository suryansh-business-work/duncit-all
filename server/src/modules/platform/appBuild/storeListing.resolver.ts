import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import {
  appStoreCategories,
  getStoreListing,
  publicAppScreenshots,
  pubStoreListing,
  updateStoreListing,
} from './storeListing.service';

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
    // Public: the websites read it at build time, and the stores already show these images.
    appScreenshots: () => publicAppScreenshots(),
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

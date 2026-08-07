import { requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { somethingForYouService } from './somethingForYou.service';
import { somethingForYouInputSchema } from './somethingForYou.validator';

const READ_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'WEBSITE_MANAGER'];
const WRITE_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];

export const somethingForYouResolvers = {
  Query: {
    somethingForYouItems: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return somethingForYouService.list();
    },
    // Deliberately open: this is what Home renders, for signed-out visitors too.
    publicSomethingForYou: async () => somethingForYouService.listPublic(),
  },
  Mutation: {
    createSomethingForYouItem: async (
      _p: unknown,
      args: { input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, WRITE_ROLES);
      const data = await validate(somethingForYouInputSchema, args.input);
      return somethingForYouService.create(data);
    },
    updateSomethingForYouItem: async (
      _p: unknown,
      args: { item_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, WRITE_ROLES);
      const data = await validate(somethingForYouInputSchema, args.input);
      return somethingForYouService.update(args.item_id, data);
    },
    deleteSomethingForYouItem: async (
      _p: unknown,
      args: { item_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, WRITE_ROLES);
      return somethingForYouService.remove(args.item_id);
    },
  },
};

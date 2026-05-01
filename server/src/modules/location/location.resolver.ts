import { locationService } from './location.service';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const locationResolvers = {
  Query: {
    locations: async (_p: unknown, args: { filter?: any }) => locationService.list(args.filter),
    location: async (_p: unknown, args: { location_doc_id: string }) =>
      locationService.getById(args.location_doc_id),
  },
  Mutation: {
    createLocation: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return locationService.create(args.input);
    },
    updateLocation: async (
      _p: unknown,
      args: { location_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return locationService.update(args.location_doc_id, args.input);
    },
    deleteLocation: async (
      _p: unknown,
      args: { location_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return locationService.remove(args.location_doc_id);
    },
  },
};

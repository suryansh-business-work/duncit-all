import { locationService } from './location.service';
import { clubService } from '@modules/pods/club/club.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const locationResolvers = {
  Location: {
    // Resolved only when selected. The full clubs-by-location aggregation runs at
    // most once per request (memoised on the context), so a list of cities costs
    // a single query rather than one per city.
    active_club_count: async (parent: { id: string }, _a: unknown, ctx: GraphQLContext) => {
      const cache = ctx as GraphQLContext & {
        _activeClubCountsByLocation?: Promise<Record<string, number>>;
      };
      cache._activeClubCountsByLocation ??= clubService.activeClubCountsByLocation();
      const counts = await cache._activeClubCountsByLocation;
      return counts[String(parent.id)] ?? 0;
    },
  },
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

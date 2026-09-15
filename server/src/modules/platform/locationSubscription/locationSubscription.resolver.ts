import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { locationSubscriptionService } from './locationSubscription.service';
import { sendLaunchMessage } from './locationSubscription.send';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

interface CityArgs {
  location_doc_id: string;
}

interface TableArgs {
  query?: TableQueryInput | null;
}

export const locationSubscriptionResolvers = {
  Query: {
    // Readable signed-out too — the subscribe page is shareable. The caller's
    // id is passed only so `is_subscribed` can answer for them.
    locationLaunchStatus: async (_p: unknown, args: CityArgs, ctx: GraphQLContext) =>
      locationSubscriptionService.launchStatus(args.location_doc_id, ctx.user?.id ?? null),

    locationSubscriptionsTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return locationSubscriptionService.table(args.query);
    },
    locationSubscriptionCities: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return locationSubscriptionService.cities();
    },
  },

  Mutation: {
    subscribeLocationLaunch: async (_p: unknown, args: CityArgs, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return locationSubscriptionService.subscribe(user.id, args.location_doc_id);
    },
    sendLocationLaunchMessage: async (_p: unknown, args: CityArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return sendLaunchMessage(args.location_doc_id);
    },
  },
};

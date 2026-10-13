import type { GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import type { TableQueryInput } from '@utils/table-query';
import {
  venueFoodOrderService,
  type PlaceFoodOrderInput,
  type VerifyFoodOrderInput,
} from './venueFoodOrder.service';

/**
 * Placing, paying and reading an order are PUBLIC on purpose — a guest scans
 * the venue QR and orders without an account; the order's access key is what
 * keeps it theirs. Running the board needs a session, and the service checks
 * that the session owns the venue (or holds the venues console).
 */
const VENUE_EDIT = consoleEditors('VENUE');

/** The signed-in operator, and whether the venues console lets them act on any venue. */
function operator(ctx: GraphQLContext) {
  const user = requireAuth(ctx);
  return { userId: user.id, isAdmin: hasRole(user, VENUE_EDIT) };
}

export const venueFoodResolvers = {
  Query: {
    venueFoodOrder: (_p: unknown, args: { order_id: string; access_key?: string | null }, ctx: GraphQLContext) =>
      venueFoodOrderService.read(ctx, args.order_id, args.access_key),
    venueFoodOrdersTable: (
      _p: unknown,
      args: { venue_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodOrderService.table(userId, isAdmin, args.venue_id, args.query);
    },
  },
  Mutation: {
    placeVenueFoodOrder: (_p: unknown, args: { input: PlaceFoodOrderInput }, ctx: GraphQLContext) =>
      venueFoodOrderService.place(ctx, args.input),
    verifyVenueFoodOrderPayment: (_p: unknown, args: { input: VerifyFoodOrderInput }, ctx: GraphQLContext) =>
      venueFoodOrderService.verify(ctx, args.input),
    setVenueFoodOrderStatus: (_p: unknown, args: { order_id: string; status: string }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodOrderService.setStatus(userId, isAdmin, args.order_id, args.status);
    },
    cancelVenueFoodOrder: (_p: unknown, args: { order_id: string; reason: string }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodOrderService.cancel(userId, isAdmin, args.order_id, args.reason);
    },
  },
};

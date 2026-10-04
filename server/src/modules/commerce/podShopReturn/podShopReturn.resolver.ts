import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { podShopReturnService, type ReturnActor, type ReturnRequestInput } from './podShopReturn.service';
import { PodShopReturnModel } from './podShopReturn.model';
import { returnableLines } from './podShopReturn.rules';

/** The public order a field resolver receives — only what the return rules read. */
interface OrderParent {
  id: string;
  channel: string;
  cancelled_at: string | null;
  delivered_at: string | null;
  fulfilment_status: string;
  updated_at: string;
  line_items: { product_id: string; variant_id: string; qty: number; return_window_days: number }[];
}

const asDate = (iso: string | null) => (iso ? new Date(iso) : null);

// The Products team decides any return; a brand owner decides their own brand's.
const STAFF = ['SUPER_ADMIN', 'PRODUCTS_MANAGER', 'FINANCE_MANAGER'];
const BRAND = ['ECOMM_MANAGER'];

/** Who is acting — staff first, else a brand owner (the service checks they own the brand). */
function actorOf(ctx: GraphQLContext): ReturnActor {
  const user = requireAuth(ctx);
  const label = user.email ?? user.id;
  if (hasRole(user, STAFF)) return { kind: 'STAFF', userId: user.id, label };
  if (hasRole(user, BRAND)) return { kind: 'BRAND', userId: user.id, label };
  throw new GraphQLError('Access Denied', { extensions: { code: 'FORBIDDEN' } });
}

type IdArgs = { id: string };
type NoteArgs = { id: string; note?: string | null };

export const podShopReturnResolvers = {
  ProductOrder: {
    // Worked out from the order already loaded — only its returns are read (by indexed order_id).
    returnable: async (parent: OrderParent) => {
      if (parent.channel !== 'POD_SHOP') return [];
      const returns = await PodShopReturnModel.find({ order_id: parent.id }).select('items status').lean();
      return returnableLines(
        {
          channel: parent.channel,
          cancelled_at: asDate(parent.cancelled_at),
          delivered_at: asDate(parent.delivered_at),
          fulfilment_status: parent.fulfilment_status,
          updated_at: asDate(parent.updated_at),
          line_items: parent.line_items,
        },
        returns
      );
    },
  },
  Query: {
    myPodShopReturns: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      podShopReturnService.mine(requireAuth(ctx).id),
    podShopReturnsTable: (_p: unknown, args: { query?: TableQueryInput; brand_id?: string | null }, ctx: GraphQLContext) =>
      podShopReturnService.table(actorOf(ctx), args.query, args.brand_id),
  },
  Mutation: {
    requestPodShopReturn: (_p: unknown, args: { input: ReturnRequestInput }, ctx: GraphQLContext) =>
      podShopReturnService.request(requireAuth(ctx).id, args.input),
    cancelMyPodShopReturn: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      podShopReturnService.cancelMine(requireAuth(ctx).id, args.id),
    approvePodShopReturn: (_p: unknown, args: NoteArgs, ctx: GraphQLContext) =>
      podShopReturnService.approve(actorOf(ctx), args.id, args.note ?? ''),
    rejectPodShopReturn: (_p: unknown, args: NoteArgs, ctx: GraphQLContext) =>
      podShopReturnService.reject(actorOf(ctx), args.id, args.note ?? ''),
    retryPodShopReturnPickup: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      podShopReturnService.retryPickup(actorOf(ctx), args.id),
    markPodShopReturnReceived: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      podShopReturnService.markReceived(actorOf(ctx), args.id),
    refundPodShopReturn: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      podShopReturnService.refund(actorOf(ctx), args.id),
    retryPodShopReturnRefund: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      podShopReturnService.retryRefund(actorOf(ctx), args.id),
  },
};

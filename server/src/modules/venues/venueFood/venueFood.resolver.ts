import type { GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { consoleEditors, consoleGovernors } from '@modules/portals/console-access';
import { assertVenueFinanceScope } from '@modules/finance/financeScope';
import type { TableQueryInput } from '@utils/table-query';
import { venueFoodRating } from './venueFood.rating';
import { objectId } from './venueFoodOrder.shared';
import { VenueFoodOrderModel } from './venueFoodOrder.model';
import { venueFoodStatsService } from './venueFood.stats';
import { venueFoodMineService, type MyFoodOrdersInput } from './venueFoodOrder.mine';
import { availableFoodCoupons } from './venueFoodCoupon.available';
import { venueFoodGuestService, type FoodFeedbackInput } from './venueFoodOrder.guest';
import {
  venueFoodCouponService,
  type CreateFoodCouponInput,
  type FoodCouponInput,
} from './venueFoodCoupon.service';
import {
  venueFoodOrderService,
  type PlaceFoodOrderInput,
  type PreviewFoodCouponInput,
  type VerifyFoodOrderInput,
} from './venueFoodOrder.service';

/**
 * Placing, paying and reading an order — and checking a coupon code — are
 * PUBLIC on purpose: a guest scans the venue QR and orders without an account;
 * the order's access key is what keeps it theirs. Running the board and the
 * coupons needs a session, and the service checks that the session owns the
 * venue (or holds the venues console).
 */
const VENUE_EDIT = consoleEditors('VENUE');
/**
 * Cancelling sends the guest's money back, and money is a GOVERN power
 * (portals/console-access.ts): the venues console role runs the board and the
 * coupons of any venue but refunds nobody's order — only the venue's owner and
 * the platform governors do.
 */
const VENUE_GOVERN = consoleGovernors('VENUE');

/** The signed-in operator, and whether `roles` let them act on any venue. */
function operator(ctx: GraphQLContext, roles: readonly string[] = VENUE_EDIT) {
  const user = requireAuth(ctx);
  return { userId: user.id, isAdmin: hasRole(user, roles) };
}

/** The venue an order belongs to — null for an unknown order, which the scope check refuses. */
async function venueOfOrder(orderId: string) {
  const order = await VenueFoodOrderModel.findById(objectId(orderId, 'Invalid order id')).select('venue_id').lean();
  return order?.venue_id ?? null;
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
    previewVenueFoodCoupon: (_p: unknown, args: { input: PreviewFoodCouponInput }) =>
      venueFoodOrderService.previewCoupon(args.input),
    availableVenueFoodCoupons: (_p: unknown, args: { venue_id: string }) => availableFoodCoupons(args.venue_id),
    venueFoodCouponsTable: (
      _p: unknown,
      args: { venue_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodCouponService.table(userId, isAdmin, args.venue_id, args.query);
    },
    venueFoodOrderInvoicePdfBase64: (
      _p: unknown,
      args: { order_id: string; access_key?: string | null },
      ctx: GraphQLContext
    ) => venueFoodGuestService.invoicePdfBase64(ctx, args.order_id, args.access_key),
    myVenueFoodOrders: (_p: unknown, args: { input: MyFoodOrdersInput }, ctx: GraphQLContext) =>
      venueFoodMineService.list(ctx, args.input),
    venueFoodRating: (_p: unknown, args: { venue_id: string }) => venueFoodRating(args.venue_id),
    venueFoodStats: (_p: unknown, args: { venue_id: string; days?: number | null }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodStatsService.stats(userId, isAdmin, args.venue_id, args.days);
    },
  },
  Mutation: {
    placeVenueFoodOrder: (_p: unknown, args: { input: PlaceFoodOrderInput }, ctx: GraphQLContext) =>
      venueFoodOrderService.place(ctx, args.input),
    verifyVenueFoodOrderPayment: (_p: unknown, args: { input: VerifyFoodOrderInput }, ctx: GraphQLContext) =>
      venueFoodOrderService.verify(ctx, args.input),
    venueFoodFeedbackUploadPass: (
      _p: unknown,
      args: { order_id: string; access_key?: string | null },
      ctx: GraphQLContext
    ) => venueFoodGuestService.feedbackUploadPass(ctx, args.order_id, args.access_key),
    submitVenueFoodFeedback: (_p: unknown, args: { input: FoodFeedbackInput }, ctx: GraphQLContext) =>
      venueFoodGuestService.submitFeedback(ctx, args.input),
    setVenueFoodOrderStatus: (_p: unknown, args: { order_id: string; status: string }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodOrderService.setStatus(userId, isAdmin, args.order_id, args.status);
    },
    cancelVenueFoodOrder: async (_p: unknown, args: { order_id: string; reason: string }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx, VENUE_GOVERN);
      // A city or zonal governor refunds only inside their own city / zones.
      if (isAdmin) await assertVenueFinanceScope(ctx, VENUE_GOVERN, () => venueOfOrder(args.order_id));
      return venueFoodOrderService.cancel(userId, isAdmin, args.order_id, args.reason);
    },
    createVenueFoodCoupon: (_p: unknown, args: { input: CreateFoodCouponInput }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodCouponService.create(userId, isAdmin, args.input);
    },
    updateVenueFoodCoupon: (
      _p: unknown,
      args: { coupon_id: string; input: FoodCouponInput },
      ctx: GraphQLContext
    ) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodCouponService.update(userId, isAdmin, args.coupon_id, args.input);
    },
    setVenueFoodCouponActive: (
      _p: unknown,
      args: { coupon_id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodCouponService.setActive(userId, isAdmin, args.coupon_id, args.is_active);
    },
    deleteVenueFoodCoupon: (_p: unknown, args: { coupon_id: string }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
      return venueFoodCouponService.remove(userId, isAdmin, args.coupon_id);
    },
  },
};

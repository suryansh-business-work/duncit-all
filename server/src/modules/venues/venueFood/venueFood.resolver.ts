import type { GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import type { TableQueryInput } from '@utils/table-query';
import { venueFoodStatsService } from './venueFood.stats';
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
    previewVenueFoodCoupon: (_p: unknown, args: { input: PreviewFoodCouponInput }) =>
      venueFoodOrderService.previewCoupon(args.input),
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
    cancelVenueFoodOrder: (_p: unknown, args: { order_id: string; reason: string }, ctx: GraphQLContext) => {
      const { userId, isAdmin } = operator(ctx);
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

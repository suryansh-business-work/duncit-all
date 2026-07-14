import { couponService } from './coupon.service';
import { createCouponSchema, updateCouponSchema, couponPreviewSchema } from './coupon.validator';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER'];

export const couponResolvers = {
  Coupon: {
    pod: async (parent: any) => {
      if (!parent.pod_id) return null;
      const p = await PodModel.findById(parent.pod_id);
      if (!p) return null;
      return {
        id: String(p._id),
        pod_id: (p as any).pod_id,
        pod_title: (p as any).pod_title,
        pod_date_time: (p as any).pod_date_time?.toISOString?.() ?? null,
        pod_amount: (p as any).pod_amount,
      };
    },
  },
  Query: {
    coupons: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return couponService.list(args.filter);
    },
    couponsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return couponService.table(args.query);
    },
    coupon: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return couponService.getById(args.id);
    },
    couponsForPod: (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return couponService.listForPod(args.pod_id);
    },
    couponsForPodTable: (_p: unknown, args: { pod_id: string; query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return couponService.tableForPod(args.pod_id, args.query);
    },
    availableCouponsForPod: (_p: unknown, args: { pod_id?: string }) =>
      couponService.listAvailableForPod(args.pod_id ?? null),
    previewCoupon: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      const input = await validate(couponPreviewSchema, args.input);
      return couponService.preview(input, u.id);
    },
  },
  Mutation: {
    createCoupon: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      const input = await validate(createCouponSchema, args.input);
      return couponService.create(input);
    },
    updateCoupon: async (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      const input = await validate(updateCouponSchema, args.input);
      return couponService.update(args.id, input);
    },
    deleteCoupon: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return couponService.remove(args.id);
    },
  },
};

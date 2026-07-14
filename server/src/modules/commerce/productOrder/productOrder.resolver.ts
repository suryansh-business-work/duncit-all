import { productOrderService } from './productOrder.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { FulfilmentMethod, FulfilmentStatus } from './productOrder.model';

const OPS_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'PRODUCTS_MANAGER', 'FINANCE_MANAGER'];

export const productOrderResolvers = {
  ProductOrder: {
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
    myProductOrders: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return productOrderService.listForBuyer(u.id);
    },
    myProductOrdersForPod: (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return productOrderService.listForBuyer(u.id, args.pod_doc_id);
    },
    productOrders: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.list(args.filter);
    },
    productOrdersTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.table(args.query);
    },
    productOrder: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.getById(args.id);
    },
    productOrderTracking: (_p: unknown, args: { order_no: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return productOrderService.trackingByOrderNo(args.order_no);
    },
  },
  Mutation: {
    advanceProductOrderStatus: (
      _p: unknown,
      args: { id: string; status: FulfilmentStatus; note?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.advanceStatus(args.id, args.status, args.note ?? '');
    },
    setProductOrderFulfilmentMethod: (
      _p: unknown,
      args: { id: string; method: FulfilmentMethod },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.setFulfilmentMethod(args.id, args.method);
    },
    createProductOrderShipment: (
      _p: unknown,
      args: { id: string; pickup_location?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.createShipmentForOrder(args.id, args.pickup_location);
    },
    refreshProductOrderTracking: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.refreshTrackingById(args.id);
    },
  },
};

import { productOrderService } from './productOrder.service';
import { loadPodSummary } from '@modules/pods/pod/pod.loaders';
import type { IdLike } from '@utils/request-cache';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { FulfilmentMethod, FulfilmentStatus } from './productOrder.model';
import type { ShipmentDocument } from '@modules/commerce/shiprocket/shiprocket.shipment';
import { cancelPodShopOrder, retryOrderRefund } from './productOrder.cancel';
import type { TableQueryInput } from '@utils/table-query';

const OPS_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'PRODUCTS_MANAGER', 'FINANCE_MANAGER'];
// Cancelling sends money back — the Products team and Finance only.
const CANCEL_RW = ['SUPER_ADMIN', 'PRODUCTS_MANAGER', 'FINANCE_MANAGER'];
// Admin › User details reads one member's orders — the same people who read their payments there.
const USER_ORDERS_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER', 'PRODUCTS_MANAGER'];

export const productOrderResolvers = {
  ProductOrder: {
    pod: (parent: { pod_id?: IdLike }, _a: unknown, ctx: GraphQLContext) => loadPodSummary(ctx, parent.pod_id),
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
    userProductOrdersTable: (_p: unknown, args: { user_id: string; query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, USER_ORDERS_READ);
      return productOrderService.tableForUser(args.user_id, args.query);
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
    forceCancelProductOrder: async (_p: unknown, args: { id: string; reason: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, CANCEL_RW);
      const order = await cancelPodShopOrder(args.id, { source: 'ADMIN', actor: user.email ?? user.id, reason: args.reason });
      return productOrderService.toPub(order);
    },
    retryProductOrderRefund: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, CANCEL_RW);
      return productOrderService.toPub(await retryOrderRefund(args.id));
    },
    productOrderShipmentFile: (
      _p: unknown,
      args: { ids: string[]; kind: ShipmentDocument },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, OPS_RW);
      return productOrderService.shipmentFile(args.ids, args.kind);
    },
  },
};

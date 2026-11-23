import type { GraphQLContext } from '@context';
import { LOYALTY_ADMIN_READ, LOYALTY_ADMIN_WRITE, requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { giftCardSettingsService } from '@modules/finance/giftcard/giftcard.settings.service';
import { giftCardDesignService, type GiftCardDesignInput } from './giftCardDesign.service';
import { giftCardOrderService } from './giftCardOrder.service';
import { giftCardOrderAdminService } from './giftCardOrder.admin.service';
import {
  bookGiftCardShipment,
  giftCardLabelFile,
  refreshGiftCardTracking,
} from './giftCardOrder.shipment';
import type { IGiftCardShippingAddress } from './giftCardOrder.model';

/**
 * Members: the storefront and their own orders (signed-in, own rows only).
 * Loyalty: the catalogue, the order book and fulfilment — read by the Loyalty
 * read seats, changed only by the write seats, enforced here on the server.
 */

type Id = { id: string };

async function adminView(orderId: string) {
  const order = await giftCardOrderService.findById(orderId);
  return giftCardOrderAdminService.adminOrderPub(order, await giftCardOrderAdminService.usersOf([order]));
}

export const giftCardOrderResolvers = {
  Query: {
    giftCardStorefront: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const [settings, design, finance] = await Promise.all([
        giftCardSettingsService.pub(),
        giftCardDesignService.defaultDesign(),
        getFinanceSettings(),
      ]);
      return {
        design: design
          ? {
              id: String(design._id),
              name: design.name,
              front_image_url: design.front_image_url,
              back_image_url: design.back_image_url,
            }
          : null,
        settings,
        physical_available: settings.physical_enabled && design ? design.physical_stock : 0,
        currency_symbol: finance.currency_symbol,
      };
    },
    myGiftCardOrders: (
      _p: unknown,
      args: { page?: number | null; page_size?: number | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return giftCardOrderService.myOrders(user.id, args.page ?? 1, args.page_size ?? 20);
    },
    myGiftCardOrder: (_p: unknown, args: { order_no: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return giftCardOrderService.myOrder(user.id, args.order_no);
    },
    giftCardDesignsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardDesignService.table(args.query);
    },
    giftCardDesign: (_p: unknown, args: Id, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardDesignService.byId(args.id);
    },
    giftCardDesignCategories: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardDesignService.categories();
    },
    giftCardOrdersTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardOrderAdminService.table(args.query);
    },
    giftCardOrderAdmin: (_p: unknown, args: Id, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardOrderAdminService.detail(args.id);
    },
    giftCardOrderStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardOrderAdminService.stats();
    },
    giftCardShippingSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return giftCardSettingsService.shipping();
    },
  },
  Mutation: {
    createGiftCardDesign: (_p: unknown, args: { input: GiftCardDesignInput }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardDesignService.create(args.input, actor.id);
    },
    updateGiftCardDesign: (
      _p: unknown,
      args: { id: string; input: GiftCardDesignInput },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardDesignService.update(args.id, args.input, actor.id);
    },
    setDefaultGiftCardDesign: (_p: unknown, args: Id, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardDesignService.setDefault(args.id, actor.id);
    },
    adjustGiftCardDesignStock: (
      _p: unknown,
      args: { id: string; delta: number; reason: string },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardDesignService.adjustStock(args.id, args.delta, args.reason, actor.id);
    },
    markGiftCardOrderPrinted: (_p: unknown, args: Id, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardOrderAdminService.markPrinted(args.id, actor.id);
    },
    updateGiftCardOrderAddress: (
      _p: unknown,
      args: { id: string; input: Partial<Record<keyof IGiftCardShippingAddress, string | null>> },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardOrderAdminService.updateAddress(args.id, args.input, actor.id);
    },
    bookGiftCardOrderShipment: async (_p: unknown, args: Id, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      await bookGiftCardShipment(await giftCardOrderService.findById(args.id), actor.id);
      return adminView(args.id);
    },
    refreshGiftCardOrderTracking: async (_p: unknown, args: Id, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_WRITE);
      await refreshGiftCardTracking(await giftCardOrderService.findById(args.id));
      return adminView(args.id);
    },
    giftCardOrderLabelFile: async (_p: unknown, args: Id, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return giftCardLabelFile(await giftCardOrderService.findById(args.id));
    },
  },
};

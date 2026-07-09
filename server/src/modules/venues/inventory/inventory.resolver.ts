import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { inventoryService } from './inventory.service';

export const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'PRODUCTS_MANAGER'];

export const inventoryResolvers = {
  Query: {
    inventoryProducts: async (
      _p: unknown,
      args: { search?: string; activeOnly?: boolean; status?: string; ownership?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.list(args);
    },
    marketplaceBrandProducts: async (
      _p: unknown,
      args: { brand_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.listMarketplaceBrandProducts(args.brand_doc_id);
    },
    productListingRequests: async (
      _p: unknown,
      args: { status?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.listProductRequests(args.status ?? null);
    },
    myProductListings: async (_p: unknown, args: { brand_id?: string | null }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return inventoryService.listMyProductListings(ctx.user, args.brand_id);
    },
    availablePodProducts: async (
      _p: unknown,
      args: { super_category_id?: string | null; category_id?: string | null; sub_category_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return inventoryService.listAvailablePodProducts(args);
    },
    inventoryProduct: async (_p: unknown, args: { product_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.getById(args.product_doc_id);
    },
    // Any signed-in user can read a single product's public details (name, brand,
    // description, images) — used by the product-detail view on a pod's shop.
    publicInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return inventoryService.getById(args.product_doc_id);
    },
    inventoryActivityLogs: async (
      _p: unknown,
      args: { product_doc_id: string; limit?: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.listActivityLogs(args.product_doc_id, args.limit ?? 100);
    },
    inventoryStockMovements: async (
      _p: unknown,
      args: { product_doc_id: string; limit?: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.listStockMovements(args.product_doc_id, args.limit ?? 100);
    },
    inventoryAnalytics: async (
      _p: unknown,
      args: { product_doc_id: string; days?: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.analytics(args.product_doc_id, args.days ?? 30);
    },
    inventoryProductLinkedPods: async (
      _p: unknown,
      args: { product_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.listLinkedPods(args.product_doc_id);
    },
  },
  Mutation: {
    createInventoryProduct: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.create(args.input, ctx.user);
    },
    submitProductListing: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return inventoryService.submitProductListing(args.input, ctx.user);
    },
    updateMyProductListing: async (
      _p: unknown,
      args: { product_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return inventoryService.updateMyProductListing(args.product_doc_id, args.input, ctx.user);
    },
    updateMyProductListingQuantity: async (
      _p: unknown,
      args: { product_doc_id: string; inventory_count: number },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return inventoryService.updateMyProductListingQuantity(args.product_doc_id, args.inventory_count, ctx.user);
    },
    deleteMyProductListing: async (_p: unknown, args: { product_doc_id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return inventoryService.deleteMyProductListing(args.product_doc_id, ctx.user);
    },
    reviewProductListing: async (
      _p: unknown,
      args: { product_doc_id: string; status: string; notes?: string; commission_pct?: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.reviewProductListing(
        args.product_doc_id,
        args.status,
        args.notes,
        ctx.user,
        args.commission_pct
      );
    },
    updateInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.update(args.product_doc_id, args.input, ctx.user);
    },
    deleteInventoryProduct: async (_p: unknown, args: { product_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.remove(args.product_doc_id, ctx.user);
    },
    permanentlyDeleteInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.permanentlyDelete(args.product_doc_id, ctx.user);
    },
    archiveInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.archive(args.product_doc_id, ctx.user);
    },
    restoreInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.restore(args.product_doc_id, ctx.user);
    },
    duplicateInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.duplicate(args.product_doc_id, ctx.user);
    },
    recordInventoryStockMovement: async (
      _p: unknown,
      args: { product_doc_id: string; input: { type: string; quantity: number; reason?: string } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.recordStockMovement(args.product_doc_id, args.input, ctx.user);
    },
    generateInventorySku: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.generateSku();
    },
  },
};

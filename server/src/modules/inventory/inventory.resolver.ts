import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { inventoryService } from './inventory.service';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const inventoryResolvers = {
  Query: {
    inventoryProducts: async (
      _p: unknown,
      args: { search?: string; activeOnly?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.list(args);
    },
    inventoryProduct: async (_p: unknown, args: { product_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.getById(args.product_doc_id);
    },
  },
  Mutation: {
    createInventoryProduct: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.create(args.input);
    },
    updateInventoryProduct: async (
      _p: unknown,
      args: { product_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.update(args.product_doc_id, args.input);
    },
    deleteInventoryProduct: async (_p: unknown, args: { product_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return inventoryService.remove(args.product_doc_id);
    },
  },
};
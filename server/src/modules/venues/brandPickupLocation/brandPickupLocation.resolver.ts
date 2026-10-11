import { brandPickupLocationService } from './brandPickupLocation.service';
import type { GraphQLContext } from '@context';
import { requireRole, requireAuth } from '@middleware/rbac';
import { ADMIN_RW } from '@modules/venues/inventory/inventory.resolver';

export const brandPickupLocationResolvers = {
  Query: {
    brandPickupLocations: (
      _p: unknown,
      args: { owner_kind?: string; brand_doc_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.list({ owner_kind: args.owner_kind, brand_id: args.brand_doc_id });
    },
    myBrandPickupLocations: (_p: unknown, args: { brand_doc_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.listMine(user.id, args.brand_doc_id);
    },
    brandPickupLocationUsage: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.usage(args.id);
    },
    myBrandPickupLocationUsage: (_p: unknown, args: { brand_doc_id: string; id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.usageMine(user.id, args.brand_doc_id, args.id);
    },
  },
  Mutation: {
    saveBrandPickupLocation: (_p: unknown, args: { id?: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.save(args.id, args.input);
    },
    deleteBrandPickupLocation: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.remove(args.id);
    },
    setDefaultBrandPickupLocation: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.setDefault(args.id);
    },
    registerBrandPickupWithShiprocket: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.registerWithShiprocket(args.id);
    },
    setBrandPickupLocationActive: (_p: unknown, args: { id: string; active: boolean }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return brandPickupLocationService.setActive(args.id, args.active);
    },
    syncMyBrandPickupLocations: (_p: unknown, args: { brand_doc_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.syncMine(user.id, args.brand_doc_id);
    },
    saveMyBrandPickupLocation: (
      _p: unknown,
      args: { brand_doc_id: string; id?: string | null; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.saveMine(user.id, args.brand_doc_id, args.id, args.input);
    },
    deleteMyBrandPickupLocation: (
      _p: unknown,
      args: { brand_doc_id: string; id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.removeMine(user.id, args.brand_doc_id, args.id);
    },
    setDefaultMyBrandPickupLocation: (
      _p: unknown,
      args: { brand_doc_id: string; id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.setDefaultMine(user.id, args.brand_doc_id, args.id);
    },
    setMyBrandPickupLocationActive: (
      _p: unknown,
      args: { brand_doc_id: string; id: string; active: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return brandPickupLocationService.setActiveMine(user.id, args.brand_doc_id, args.id, args.active);
    },
  },
};

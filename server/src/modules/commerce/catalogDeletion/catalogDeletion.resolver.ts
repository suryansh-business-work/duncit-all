import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { catalogDeletionService, type DeletionRequestInput } from './catalogDeletion.service';
import { updateDeletionWindow } from './catalogDeletion.window';
import type { DeletionKind } from './catalogDeletion.model';

// The Products team reviews deletions; the partner side is owner-scoped in the service.
const PRODUCTS_TEAM = ['SUPER_ADMIN', 'PRODUCTS_MANAGER'];
const PARTNER = ['ECOMM_MANAGER'];

export const catalogDeletionResolvers = {
  Query: {
    catalogDeletionPreview: (_p: unknown, args: { kind: DeletionKind; target_id: string }, ctx: GraphQLContext) =>
      catalogDeletionService.preview(requireRole(ctx, PARTNER).id, args.kind, args.target_id),
    myCatalogDeletionRequests: (_p: unknown, args: { brand_id?: string | null }, ctx: GraphQLContext) =>
      catalogDeletionService.mine(requireRole(ctx, PARTNER).id, args.brand_id),
    catalogDeletionWindow: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return catalogDeletionService.window();
    },
    catalogDeletionRequestsTable: (
      _p: unknown,
      args: { kind: DeletionKind; query?: TableQueryInput; parent_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, PRODUCTS_TEAM);
      return catalogDeletionService.table(args.kind, args.query, args.parent_id);
    },
    catalogDeletionRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, PRODUCTS_TEAM);
      return catalogDeletionService.detail(args.id);
    },
  },
  Mutation: {
    requestCatalogDeletion: (_p: unknown, args: { input: DeletionRequestInput }, ctx: GraphQLContext) =>
      catalogDeletionService.request(requireRole(ctx, PARTNER).id, args.input),
    withdrawCatalogDeletion: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      catalogDeletionService.withdraw(requireRole(ctx, PARTNER).id, args.id),
    reviewCatalogDeletion: (_p: unknown, args: { id: string; approve: boolean; note?: string | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, PRODUCTS_TEAM);
      return catalogDeletionService.review(args.id, args.approve, args.note ?? '', user.email ?? user.id);
    },
    updateCatalogDeletionWindow: (_p: unknown, args: { input: { min_days: number; max_days: number } }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, PRODUCTS_TEAM);
      return updateDeletionWindow(args.input, user.id);
    },
  },
};

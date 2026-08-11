import { appPopupService, type AppPopupInput } from './appPopup.service';
import type { AppPopupClientPlatform } from './appPopup.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

/** Who manages popups — the same roles that own the rest of the marketing console. */
const MARKETING_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const appPopupResolvers = {
  Query: {
    appPopupsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, MARKETING_WRITE);
      return appPopupService.table(args.query);
    },
    activeAppPopup: async (
      _p: unknown,
      args: { platform: AppPopupClientPlatform },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return appPopupService.activeFor(u.id, args.platform);
    },
  },
  Mutation: {
    createAppPopup: async (_p: unknown, args: { input: AppPopupInput }, ctx: GraphQLContext) => {
      const u = requireRole(ctx, MARKETING_WRITE);
      return appPopupService.create(args.input, u.id);
    },
    updateAppPopup: async (
      _p: unknown,
      args: { id: string; input: AppPopupInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, MARKETING_WRITE);
      return appPopupService.update(args.id, args.input);
    },
    deleteAppPopup: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MARKETING_WRITE);
      return appPopupService.remove(args.id);
    },
    dismissAppPopup: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return appPopupService.markSeen(u.id, args.id);
    },
  },
};

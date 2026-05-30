import { portalModeService } from './portalMode.service';
import type { PortalMode } from './portalMode.model';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const portalModeResolvers = {
  Query: {
    portalModes: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return portalModeService.list();
    },
    // Public — every app reads its own row on load. No auth.
    portalMode: async (_p: unknown, args: { key: string }) => {
      return portalModeService.getPublic(args.key);
    },
  },
  Mutation: {
    setPortalMode: async (
      _p: unknown,
      args: { key: string; mode: PortalMode; note?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return portalModeService.setMode(args.key, args.mode, args.note ?? null, ctx.user?.id ?? null);
    },
  },
};

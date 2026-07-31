import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { shortLinkService } from './shortLink.service';

/** Same gate as the rest of the marketing console. */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const shortLinkResolvers = {
  Query: {
    shortLinkOptions: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.options();
    },
    shortLinksTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.table(args.query);
    },
    shortLink: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.byId(args.id);
    },
    shortLinkQr: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.qrDataUrl(args.id);
    },
  },
  Mutation: {
    createShortLink: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      // requireRole returns the authenticated user it just proved, so there is
      // no need to re-guard ctx.user for the author id.
      const user = requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.create(args.input, user.id);
    },
    setShortLinkActive: (
      _p: unknown,
      args: { id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.setActive(args.id, args.is_active);
    },
    deleteShortLink: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.remove(args.id);
    },
  },
};

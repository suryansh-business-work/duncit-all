import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { portalAccessService } from './portalAccess.service';

export const portalAccessResolvers = {
  Query: {
    myPortalAccess: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return portalAccessService.directory(user);
    },
  },
  Mutation: {
    requestPortalAccess: (_p: unknown, args: { portal_key: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return portalAccessService.requestAccess(user, args.portal_key);
    },
  },
};

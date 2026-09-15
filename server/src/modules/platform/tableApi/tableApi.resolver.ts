import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { tableApiService } from './tableApi.service';

/**
 * Signed-in only, and always the caller's own token: the token can never read
 * more than its owner already can, so no role gate is needed on top.
 */
export const tableApiResolvers = {
  Query: {
    myTableApiAccess: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      tableApiService.access(requireAuth(ctx).id),
  },
  Mutation: {
    rotateMyTableApiToken: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      tableApiService.rotate(requireAuth(ctx).id),
    revokeMyTableApiToken: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      tableApiService.revoke(requireAuth(ctx).id),
  },
};

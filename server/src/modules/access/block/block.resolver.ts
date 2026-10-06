import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { blockService } from './block.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const blockResolvers = {
  Query: {
    userBlocksTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return blockService.table(args.query ?? undefined);
    },
  },
  Mutation: {
    blockUser: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) =>
      blockService.block(requireAuth(ctx).id, args.user_id),
    unblockUser: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) =>
      blockService.unblock(requireAuth(ctx).id, args.user_id),
  },
};

import { coinService } from './coin.service';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';

// No role gate: every signed-in account earns coins on what it spends. Showing
// the section only in User studio mode is a presentation choice the sidebar
// makes, not an authorization boundary — a partner still owns their balance.
export const coinResolvers = {
  Query: {
    myCoinBalance: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return coinService.getMyBalance(user.id);
    },
    myCoinTransactions: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return coinService.listMyTransactions(user.id);
    },
  },
};

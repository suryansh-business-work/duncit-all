import { coinService } from './coin.service';
import { coinAdminService } from './coin.admin.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

// Coin liability is a platform-wide money figure, not a zone-scoped one, so it
// takes the same triple every other finance read in this module tree uses.
// FINANCE_MANAGER cannot sign into the Admin portal (portal.constants.ts), so
// the audience there is SUPER_ADMIN + CITY_ADMIN; the role stays in the array
// so the Finance console can render the same queries without a second guard.
const COIN_ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

// No role gate on the `my*` queries: every signed-in account earns coins on what
// it spends. Showing the section only in User studio mode is a presentation
// choice the sidebar makes, not an authorization boundary — a partner still
// owns their balance.
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
    coinAdminStats: async (
      _p: unknown,
      args: { months?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, COIN_ADMIN_READ);
      return coinAdminService.stats(args.months);
    },
    coinTransactionsTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null; pod_doc_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, COIN_ADMIN_READ);
      return coinAdminService.table(args.query, args.pod_doc_id);
    },
  },
};

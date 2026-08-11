import { coinService } from './coin.service';
import { coinAdminService } from './coin.admin.service';
import { coinSettingsService } from './coin.settings.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

// Coin liability is a platform-wide money figure, not a zone-scoped one, so it
// takes the same triple every other finance read in this module tree uses. The
// console itself lives in the Finance portal, which only FINANCE_MANAGER signs
// into; the other two keep their read so a platform-wide number stays visible
// to the roles that answer for it.
const COIN_ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

// Writing is a narrower door than reading. Setting a rate changes what every
// future payment pays out, and a manual adjustment mints value out of nothing —
// so neither is offered to the read-only audience.
const COIN_ADMIN_WRITE = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

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
    coinSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, COIN_ADMIN_READ);
      return coinSettingsService.pub();
    },
    coinUserSearch: async (_p: unknown, args: { term: string }, ctx: GraphQLContext) => {
      requireRole(ctx, COIN_ADMIN_WRITE);
      return coinAdminService.userSearch(args.term);
    },
  },
  Mutation: {
    updateCoinSettings: async (
      _p: unknown,
      args: {
        input: {
          pod_join_earn_pct?: number | null;
          shop_earn_pct?: number | null;
          coins_per_referral?: number | null;
        };
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, COIN_ADMIN_WRITE);
      return coinSettingsService.update(args.input);
    },
    adjustUserCoins: async (
      _p: unknown,
      args: { user_id: string; direction: 'GRANT' | 'DEDUCT'; coins: number; reason: string },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, COIN_ADMIN_WRITE);
      const result = await coinService.adminAdjust({
        userId: args.user_id,
        adminId: actor.id,
        direction: args.direction,
        coins: args.coins,
        reason: args.reason,
      });
      return { user_id: args.user_id, ...result };
    },
  },
};

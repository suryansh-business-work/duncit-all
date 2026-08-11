import { leaderboardService, type LeaderboardPeriod } from './leaderboard.service';
import { leaderboardAdminService } from './leaderboard.admin.service';
import type { LeaderboardCategory } from './leaderboard.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

// The boards ship in the consumer apps, so reading the admin side mirrors the
// admin portal's own audience; writing the economics is platform-admin only.
const LEADERBOARD_ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const LEADERBOARD_ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const leaderboardResolvers = {
  Query: {
    leaderboard: async (
      _p: unknown,
      args: { category: LeaderboardCategory; period?: LeaderboardPeriod | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return leaderboardService.board(user.id, args.category, args.period ?? 'MONTH');
    },
    // Unauthenticated by design, like the ad rate card: the config carries no
    // user data, and the sidebar renders it before sign-in state settles.
    leaderboardConfig: async () => leaderboardService.getConfig(),
    leaderboardSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEADERBOARD_ADMIN_READ);
      return leaderboardService.getSettings();
    },
    leaderboardPointsTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LEADERBOARD_ADMIN_READ);
      return leaderboardAdminService.table(args.query);
    },
    leaderboardAdminStats: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEADERBOARD_ADMIN_READ);
      return leaderboardAdminService.stats();
    },
  },
  Mutation: {
    updateLeaderboardSettings: async (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LEADERBOARD_ADMIN_WRITE);
      return leaderboardService.updateSettings(args.input);
    },
  },
};

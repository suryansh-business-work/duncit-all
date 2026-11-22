import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { callerEnvironment } from '@modules/ai/askBot/askBot.links';
import { ANALYTICS_ROLES } from '../entity/entityAnalytics.resolver';
import { APP_INSIGHT_STORES, type AppInsightStore } from './appInsights.metrics';
import { appInsightsDaily, appInsightsSyncLogs, type DailyArgs } from './appInsights.read';
import { appInsightsStatus } from './appInsights.status';
import { startManualSync } from './appInsights.sync';

/**
 * Analytics > App Insights. Read and synced by the Analytics console's staff
 * (SUPER_ADMIN, ANALYTICS_MANAGER) only — the role is checked before anything
 * else runs, so a refused caller learns nothing, not even whether a store is
 * configured. A sync is recorded in the sync log with who started it.
 */

const reader = (ctx: GraphQLContext) => requireRole(ctx, ANALYTICS_ROLES);

export const appInsightsResolvers = {
  Query: {
    appInsightsStatus: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      reader(ctx);
      return appInsightsStatus(callerEnvironment(ctx.req));
    },
    appInsightsSyncLogs: (
      _p: unknown,
      args: { store?: AppInsightStore | null; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      reader(ctx);
      return appInsightsSyncLogs(args.store, args.limit);
    },
    appInsightsDaily: (_p: unknown, args: DailyArgs, ctx: GraphQLContext) => {
      reader(ctx);
      return appInsightsDaily(args);
    },
  },
  Mutation: {
    syncAppInsights: async (_p: unknown, args: { store?: AppInsightStore | null }, ctx: GraphQLContext) => {
      const user = reader(ctx);
      await startManualSync(args.store ? [args.store] : APP_INSIGHT_STORES, user.id);
      return appInsightsStatus(callerEnvironment(ctx.req));
    },
  },
};

import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { AI_USAGE_READ } from '@modules/ai/openaiUsage/openaiUsage.resolver';
import { aiOverviewService } from './aiOverview.service';

// The AI portal's own readers — the same people who read spend on the other AI
// dashboards. Never on the Redis response cache: the query is role-gated.
export const aiOverviewResolvers = {
  Query: {
    aiOverviewDashboard: (_p: unknown, args: { range_days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_USAGE_READ);
      return aiOverviewService.dashboard(args.range_days);
    },
  },
};

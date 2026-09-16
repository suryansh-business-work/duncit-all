import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { msg91Service } from './msg91.service';

// The widget's records name every number that asked for a code, so they are
// read by the same roles that manage the credentials behind them.
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

interface WindowArgs {
  start_date: string;
  end_date: string;
}

export const msg91Resolvers = {
  Query: {
    msg91Configured: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return msg91Service.configured();
    },
    msg91WidgetLogs: (_p: unknown, args: WindowArgs, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return msg91Service.logs(args.start_date, args.end_date);
    },
    msg91WidgetAnalytics: (_p: unknown, args: WindowArgs, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return msg91Service.analytics(args.start_date, args.end_date);
    },
  },
};

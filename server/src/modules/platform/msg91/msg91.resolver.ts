import type { GraphQLContext } from '@context';
import { LOGS_READER, requireRole } from '@middleware/rbac';
import { msg91Service } from './msg91.service';

// The widget's records name every number that asked for a code, so only the
// consoles that own the channel read them: Communications, and Tech, which
// holds the auth key that reads the same records straight from MSG91.
const MSG91_READ = ['SUPER_ADMIN', 'COMMUNICATIONS_MANAGER', 'TECH_MANAGER'];
// ...and the Logs console, which mounts the same Logs page.
const MSG91_LOG_READ = [...MSG91_READ, LOGS_READER];

interface WindowArgs {
  start_date: string;
  end_date: string;
}

export const msg91Resolvers = {
  Query: {
    msg91Configured: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MSG91_LOG_READ);
      return msg91Service.configured();
    },
    msg91WidgetLogs: (_p: unknown, args: WindowArgs, ctx: GraphQLContext) => {
      requireRole(ctx, MSG91_LOG_READ);
      return msg91Service.logs(args.start_date, args.end_date);
    },
    msg91WidgetAnalytics: (_p: unknown, args: WindowArgs, ctx: GraphQLContext) => {
      requireRole(ctx, MSG91_READ);
      return msg91Service.analytics(args.start_date, args.end_date);
    },
  },
};

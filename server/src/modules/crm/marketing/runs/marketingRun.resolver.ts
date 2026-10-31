import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { marketingRunService, userActor } from './marketingRun.service';
import type { MarketingRunDecision } from './marketingRun.model';

/** The marketing console reads its runs; a reader seat reads them too. */
const READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_READER'];
/** Deciding, stopping and retrying runs is a manager's call. */
const ACT = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;

export const marketingRunResolvers = {
  Query: {
    marketingRunsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      requireRole(ctx, READ);
      return marketingRunService.table(args.query);
    },
    marketingRun: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, READ);
      return marketingRunService.get(args.id);
    },
    marketingRunSummary: (_p: unknown, _a: unknown, ctx: Ctx) => {
      const user = requireRole(ctx, READ);
      return marketingRunService.summary(user.id);
    },
  },
  Mutation: {
    decideMarketingRun: async (_p: unknown, args: { id: string; decision: MarketingRunDecision; note?: string | null }, ctx: Ctx) => {
      const user = requireRole(ctx, ACT);
      const actor = await userActor(user);
      return marketingRunService.decide(args.id, args.decision, { id: user.id, name: actor.name ?? '' }, args.note ?? '');
    },
    cancelMarketingRun: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ACT);
      return marketingRunService.cancel(args.id);
    },
    retryMarketingRun: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ACT);
      return marketingRunService.retry(args.id);
    },
  },
};

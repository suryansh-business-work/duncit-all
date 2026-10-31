import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { marketingAgentService, type UpdateMarketingAgentInput } from './agent.service';

/** Everyone with a seat in the Marketing console reads the agents; an editor sees them read-only. */
const READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'];
/** Switching, rescheduling and running an agent is a manager's call. */
const ACT = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;

export const marketingAgentResolvers = {
  Query: {
    marketingAgents: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, READ);
      return marketingAgentService.list();
    },
  },
  Mutation: {
    updateMarketingAgent: (_p: unknown, args: { key: string; input: UpdateMarketingAgentInput }, ctx: Ctx) => {
      const user = requireRole(ctx, ACT);
      return marketingAgentService.update(args.key, args.input, user.id);
    },
    runMarketingAgent: (_p: unknown, args: { key: string }, ctx: Ctx) => {
      const user = requireRole(ctx, ACT);
      return marketingAgentService.runNow(args.key, user);
    },
  },
};

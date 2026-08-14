import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { agentService } from './agent.service';
import type { AgentChatArgs } from './agent.types';

/**
 * The Agent is offered in every staff console, so the gate is `requireAuth`
 * and the ROLE decides what it will do rather than whether it answers at all.
 * Creating is checked inside the service (AGENT_ACT_ROLES) — a support user
 * gets a straight answer about what they cannot do instead of Access Denied on
 * a chat box.
 */
export const agentResolvers = {
  Query: {
    agentAvailability: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return agentService.availability(user.roles ?? []);
    },
  },
  Mutation: {
    agentChat: (_p: unknown, args: { input: AgentChatArgs }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return agentService.chat(args.input, { id: user.id, roles: user.roles ?? [] });
    },
  },
};

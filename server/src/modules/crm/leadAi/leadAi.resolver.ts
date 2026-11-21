import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { CRM_RW, type CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { leadAiService } from './leadAi.service';
import type { LeadAiActionStatus } from './leadAi.model';

const RW = [...CRM_RW];

type LeadArgs = { entity: CrmLeadEntityType; lead_id: string };

export const leadAiResolvers = {
  Query: {
    crmLeadAiThread: (_p: unknown, args: LeadArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return leadAiService.thread(args.entity, args.lead_id, user.id);
    },
  },
  Mutation: {
    askCrmLeadAi: (_p: unknown, args: LeadArgs & { message: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return leadAiService.ask(args.entity, args.lead_id, user.id, args.message);
    },
    setCrmLeadAiActionStatus: (
      _p: unknown,
      args: LeadArgs & { message_id: string; action_index: number; status: LeadAiActionStatus; result_message?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return leadAiService.setActionStatus(args.entity, args.lead_id, user.id, args);
    },
    clearCrmLeadAiThread: (_p: unknown, args: LeadArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return leadAiService.clear(args.entity, args.lead_id, user.id);
    },
  },
};

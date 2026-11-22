import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { leadMediaService, type LeadMediaInput } from './leadMedia.service';

const RW = [...CRM_RW];

export const leadMediaResolvers = {
  Query: {
    crmLeadMedia: (_p: unknown, args: { entity_type: string; lead_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadMediaService.list(args.entity_type, args.lead_id);
    },
  },
  Mutation: {
    addCrmLeadMedia: (
      _p: unknown,
      args: { entity_type: string; lead_id: string; items: LeadMediaInput[] },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return leadMediaService.add(args.entity_type, args.lead_id, args.items, user.id);
    },
    updateCrmLeadMedia: (_p: unknown, args: { id: string; input: LeadMediaInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadMediaService.update(args.id, args.input);
    },
    deleteCrmLeadMedia: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadMediaService.remove(args.id);
    },
  },
};

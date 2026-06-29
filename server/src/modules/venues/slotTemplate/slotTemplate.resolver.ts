import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { slotTemplateService } from './slotTemplate.service';

export const slotTemplateResolvers = {
  Query: {
    mySlotTemplates: (_p: unknown, args: { venue_id?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return slotTemplateService.listMine(user.id, args.venue_id);
    },
  },
  Mutation: {
    createSlotTemplate: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return slotTemplateService.create(user.id, args.input);
    },
    deleteSlotTemplate: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return slotTemplateService.remove(user.id, args.id);
    },
    setDefaultSlotTemplate: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return slotTemplateService.setDefault(user.id, args.id);
    },
  },
};

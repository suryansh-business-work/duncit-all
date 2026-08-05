import { aisensyService } from './aisensy.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// AiSensy management + sending is a Tech-portal capability; server-side code
// calls aisensyService.send directly (ungated) for its own notifications.
const AISENSY_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const aisensyResolvers = {
  Query: {
    aisensyStatus: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, AISENSY_MANAGE);
      return aisensyService.status();
    },
  },
  Mutation: {
    sendAisensyCampaign: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, AISENSY_MANAGE);
      return aisensyService.send(args.input);
    },
  },
};

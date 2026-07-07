import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { moderationService } from './moderation.service';
import type { ModeratePodInput } from './moderation.ai';

export const moderationResolvers = {
  Mutation: {
    moderatePodContent: (_p: unknown, args: { input: ModeratePodInput }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return moderationService.moderatePod(args.input);
    },
  },
};

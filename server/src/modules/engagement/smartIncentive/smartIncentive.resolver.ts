import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { smartIncentiveService } from './smartIncentive.service';

// Every signed-in member may be offered the incentive; the service decides
// whether THIS member is, on THIS pod.
export const smartIncentiveResolvers = {
  Query: {
    podSmartIncentive: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return smartIncentiveService.stateForPod(args.pod_id, user.id);
    },
  },
  Mutation: {
    unlockSmartIncentive: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return smartIncentiveService.unlock(args.pod_id, user.id);
    },
  },
};

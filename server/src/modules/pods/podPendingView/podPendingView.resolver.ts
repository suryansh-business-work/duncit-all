import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { podPendingViewService } from './podPendingView.service';

export const podPendingViewResolvers = {
  Query: {
    hostPodPendingView: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podPendingViewService.hostPodPendingView(args.pod_doc_id, user.id);
    },
  },
};

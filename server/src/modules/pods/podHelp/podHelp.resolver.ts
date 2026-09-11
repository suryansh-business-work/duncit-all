import { requireAuth } from '@middleware/rbac';
import type { GraphQLContext } from '@context';
import { requestPodClubAdminHelp, type PodHelpSide } from './podHelp.service';

/**
 * No `requireRole`: both sides are relationships on the pod — the host is named
 * on it and the venue owns the slot — so the service decides who may ask.
 */
export const podHelpResolvers = {
  Mutation: {
    requestPodClubAdminHelp: (
      _p: unknown,
      args: { pod_doc_id: string; side: PodHelpSide },
      ctx: GraphQLContext
    ) => requestPodClubAdminHelp(args.pod_doc_id, args.side, requireAuth(ctx).id),
  },
};

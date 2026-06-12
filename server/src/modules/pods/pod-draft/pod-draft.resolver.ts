import { podDraftService } from './pod-draft.service';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';

export const podDraftResolvers = {
  Query: {
    myPodDrafts: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podDraftService.listMine(user.id);
    },
    myPodDraft: async (_p: unknown, args: { draft_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podDraftService.getMine(user.id, args.draft_id);
    },
  },
  Mutation: {
    savePodDraft: async (
      _p: unknown,
      args: { draft_id?: string | null; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podDraftService.save(user.id, args.draft_id, args.input);
    },
    deletePodDraft: async (_p: unknown, args: { draft_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podDraftService.remove(user.id, args.draft_id);
    },
    publishPodDraft: async (
      _p: unknown,
      args: { draft_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podDraftService.publish(user.id, args.draft_id, args.input);
    },
  },
};

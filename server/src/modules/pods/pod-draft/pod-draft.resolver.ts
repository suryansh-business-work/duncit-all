import { podDraftService } from './pod-draft.service';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { draftExpiresAt, draftRetentionDays } from './pod-draft.retention';

export const podDraftResolvers = {
  // Resolved per-request rather than stamped on every draft row: only the
  // Host Studio drafts list asks for it, and it must always reflect the
  // retention window the sweep is running with TODAY, not the one in force
  // when the draft was saved.
  PodDraft: {
    expires_at: async (parent: { created_at?: string | null }) => {
      const at = draftExpiresAt(parent.created_at, await draftRetentionDays());
      return at ? at.toISOString() : null;
    },
  },
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

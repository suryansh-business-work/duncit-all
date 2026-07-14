import { podIdeaService } from './podIdea.service';
import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_ROLES.includes(r));

export const podIdeaResolvers = {
  PodIdea: {
    author: async (parent: any) => {
      if (!parent.author_id) return null;
      try {
        return await userService.getById(parent.author_id);
      } catch {
        return null;
      }
    },
  },
  PodIdeaComment: {
    author: async (parent: any) => {
      if (!parent.author_id) return null;
      try {
        return await userService.getById(parent.author_id);
      } catch {
        return null;
      }
    },
  },
  Query: {
    podIdeas: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) =>
      podIdeaService.list(args.filter, ctx.user?.id ?? null),
    podIdeasTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) =>
      podIdeaService.table(args.query, ctx.user?.id ?? null),
    podIdea: (_p: unknown, args: { pod_idea_doc_id: string }, ctx: GraphQLContext) =>
      podIdeaService.getById(args.pod_idea_doc_id, ctx.user?.id ?? null),
    myPodIdeas: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return podIdeaService.list({ author_id: u.id }, u.id);
    },
  },
  Mutation: {
    createPodIdea: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return podIdeaService.create(u.id, args.input);
    },
    updatePodIdea: (
      _p: unknown,
      args: { pod_idea_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podIdeaService.update(args.pod_idea_doc_id, u.id, isAdminCtx(ctx), args.input);
    },
    deletePodIdea: (
      _p: unknown,
      args: { pod_idea_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podIdeaService.remove(args.pod_idea_doc_id, u.id, isAdminCtx(ctx));
    },
    togglePodIdeaLike: (
      _p: unknown,
      args: { pod_idea_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podIdeaService.toggleLike(args.pod_idea_doc_id, u.id);
    },
    addPodIdeaComment: (
      _p: unknown,
      args: { pod_idea_doc_id: string; text: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podIdeaService.addComment(args.pod_idea_doc_id, u.id, args.text);
    },
    deletePodIdeaComment: (
      _p: unknown,
      args: { pod_idea_doc_id: string; comment_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podIdeaService.deleteComment(
        args.pod_idea_doc_id,
        args.comment_id,
        u.id,
        isAdminCtx(ctx)
      );
    },
    sharePodIdea: (_p: unknown, args: { pod_idea_doc_id: string }, ctx: GraphQLContext) =>
      podIdeaService.share(args.pod_idea_doc_id, ctx.user?.id ?? null),
    setPodIdeaStatus: (
      _p: unknown,
      args: { pod_idea_doc_id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return podIdeaService.setStatus(args.pod_idea_doc_id, args.status, ctx.user?.id ?? null);
    },
  },
};

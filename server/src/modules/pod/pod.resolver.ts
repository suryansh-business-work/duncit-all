import { podService } from './pod.service';
import type { GraphQLContext } from '../../context';
import { requireRole, requireAuth } from '../../middleware/rbac';
import { UserModel } from '../user/user.model';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_WRITE.includes(r));

export const podResolvers = {
  Pod: {
    host_names: async (parent: any): Promise<string[]> => {
      const ids: string[] = (parent.pod_hosts_id ?? []).filter(Boolean).map(String);
      if (ids.length === 0) return [];
      const users = await UserModel.find({ _id: { $in: ids } }).select(
        'first_name last_name'
      );
      const byId = new Map<string, string>();
      users.forEach((u: any) => {
        const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
        if (name) byId.set(String(u._id), name);
      });
      return ids.map((id) => byId.get(id)).filter(Boolean) as string[];
    },
    liked_by_me: (parent: any, _a: unknown, ctx: GraphQLContext) => {
      const uid = ctx.user?.id;
      if (!uid) return false;
      return (parent.liked_user_ids ?? []).some((x: string) => String(x) === uid);
    },
  },
  Query: {
    pods: async (_p: unknown, args: { filter?: any }) => podService.list(args.filter),
    pod: async (_p: unknown, args: { pod_doc_id: string }) => podService.getById(args.pod_doc_id),
    podComments: async (_p: unknown, args: { pod_doc_id: string }) =>
      podService.listComments(args.pod_doc_id),
  },
  Mutation: {
    createPod: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.create(args.input);
    },
    updatePod: async (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.update(args.pod_doc_id, args.input);
    },
    deletePod: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.remove(args.pod_doc_id);
    },
    incrementPodHits: async (_p: unknown, args: { pod_doc_id: string }) =>
      podService.incrementHits(args.pod_doc_id),
    togglePodLike: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.toggleLike(args.pod_doc_id, u.id);
    },
    addPodComment: async (
      _p: unknown,
      args: { pod_doc_id: string; text: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.addComment(args.pod_doc_id, u.id, args.text);
    },
    deletePodComment: async (
      _p: unknown,
      args: { pod_doc_id: string; comment_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.deleteComment(
        args.pod_doc_id,
        args.comment_id,
        u.id,
        isAdminCtx(ctx)
      );
    },
  },
};

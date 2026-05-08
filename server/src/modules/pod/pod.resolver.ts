import { podService } from './pod.service';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { UserModel } from '../user/user.model';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

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
  },
  Query: {
    pods: async (_p: unknown, args: { filter?: any }) => podService.list(args.filter),
    pod: async (_p: unknown, args: { pod_doc_id: string }) => podService.getById(args.pod_doc_id),
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
  },
};

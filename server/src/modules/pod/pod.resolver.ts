import { podService } from './pod.service';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

export const podResolvers = {
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

import { podPlanService } from './pod-plan.service';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const podPlanResolvers = {
  Query: {
    podPlans: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podPlanService.list();
    },
    publicPodPlans: async () => podPlanService.listPublic(),
  },
  Mutation: {
    createPodPlan: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podPlanService.create(args.input);
    },
    updatePodPlan: async (
      _p: unknown,
      args: { plan_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return podPlanService.update(args.plan_id, args.input);
    },
    deletePodPlan: async (_p: unknown, args: { plan_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podPlanService.remove(args.plan_id);
    },
  },
};

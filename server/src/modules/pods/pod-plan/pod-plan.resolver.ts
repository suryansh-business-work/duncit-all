import { podPlanService } from './pod-plan.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { consoleReaders } from '@modules/portals/console-access';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];
/** The Pods console's Pod Plans table also reads for `ALL_PODS_ACCESS`. */
const PLAN_READ = consoleReaders('POD');

export const podPlanResolvers = {
  Query: {
    podPlans: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podPlanService.list();
    },
    podPlansTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, PLAN_READ);
      return podPlanService.table(args.query);
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

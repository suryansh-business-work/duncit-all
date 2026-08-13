import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { membershipAdminService } from './membership.admin.service';
import { membershipService } from './membership.service';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

interface TableArgs {
  query?: TableQueryInput | null;
}

export const membershipResolvers = {
  Query: {
    // Readable signed-out too — the pricing screen is a marketing surface. The
    // caller's id is passed only so `is_subscribed` can answer for them.
    membershipPricing: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      membershipService.pricing(ctx.user?.id ?? null),

    membershipPlans: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.plans();
    },
    membershipPlansTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.plansTable(args.query);
    },
    membershipBenefits: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.benefits();
    },
    membershipBenefitsTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.benefitsTable(args.query);
    },
    membershipNewsSubscribersTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.subscribersTable(args.query);
    },
  },

  Mutation: {
    subscribeMembershipNews: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return membershipService.subscribe(user.id);
    },

    createMembershipPlan: async (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.createPlan(args.input);
    },
    updateMembershipPlan: async (
      _p: unknown,
      args: { plan_id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.updatePlan(args.plan_id, args.input);
    },
    deleteMembershipPlan: async (_p: unknown, args: { plan_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.removePlan(args.plan_id);
    },

    createMembershipBenefit: async (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.createBenefit(args.input);
    },
    updateMembershipBenefit: async (
      _p: unknown,
      args: { benefit_id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.updateBenefit(args.benefit_id, args.input);
    },
    deleteMembershipBenefit: async (
      _p: unknown,
      args: { benefit_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return membershipAdminService.removeBenefit(args.benefit_id);
    },
  },
};

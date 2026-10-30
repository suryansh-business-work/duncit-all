import type { GraphQLContext } from '@context';
import { requireRole, TESTS_MANAGER } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { e2eFlowService } from './e2eFlow.service';
import { flowRunStats, type E2eFlowRunStats } from './e2eFlow.stats';

// Flows are documented beside the e2e runs, by the same people who run them —
// in the Tests console now (they moved from Tech, whose managers keep access).
const E2E_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER', TESTS_MANAGER];

type SubFlowArgs = { flow_id: string; sub_flow_id: string };

type FlowParent = { name: string; run_stats?: E2eFlowRunStats | null };

export const e2eFlowResolvers = {
  E2eFlow: {
    // The table reads every row's counts in one pass; a single flow — its page,
    // or a mutation's answer — reads its own, so the cache is never handed null.
    run_stats: async (parent: FlowParent) =>
      parent.run_stats === undefined ? ((await flowRunStats([parent.name])).get(parent.name) ?? null) : parent.run_stats,
  },
  Query: {
    e2eFlowsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.table(args.query);
    },
    e2eFlow: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.get(args.id);
    },
  },
  Mutation: {
    createE2eFlow: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.create(args.input, user.email ?? user.id);
    },
    updateE2eFlow: (_p: unknown, args: { id: string; input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.update(args.id, args.input);
    },
    deleteE2eFlow: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.remove(args.id);
    },
    createE2eSubFlow: (
      _p: unknown,
      args: { flow_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.createSubFlow(args.flow_id, args.input);
    },
    updateE2eSubFlow: (
      _p: unknown,
      args: SubFlowArgs & { input: unknown },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.updateSubFlow(args.flow_id, args.sub_flow_id, args.input);
    },
    reviewE2eSubFlow: (
      _p: unknown,
      args: SubFlowArgs & { status: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.reviewSubFlow(
        args.flow_id,
        args.sub_flow_id,
        args.status,
        user.email ?? user.id
      );
    },
    deleteE2eSubFlow: (_p: unknown, args: SubFlowArgs, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eFlowService.deleteSubFlow(args.flow_id, args.sub_flow_id);
    },
  },
};

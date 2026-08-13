import type { TableQueryInput } from '@utils/table-query';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { openAiUsageService } from './openaiUsage.service';

// OpenAI usage and spend are read from the AI portal (AI_MANAGER) + platform admins.
const AI_USAGE_READ = ['SUPER_ADMIN', 'AI_MANAGER'];
// The rate card decides what every future row costs, so editing it is admin-only.
const AI_USAGE_WRITE = ['SUPER_ADMIN', 'AI_MANAGER'];

export const openAiUsageResolvers = {
  Query: {
    openAiUsageDashboard: (
      _p: unknown,
      args: { range_days?: number | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, AI_USAGE_READ);
      return openAiUsageService.dashboard(args.range_days);
    },
    openAiUsageLogsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, AI_USAGE_READ);
      return openAiUsageService.logsTable(args.query);
    },
    openAiUsageLog: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_USAGE_READ);
      return openAiUsageService.log(args.id);
    },
    openAiTaskCatalogue: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, AI_USAGE_READ);
      return openAiUsageService.taskCatalogue();
    },
  },
  Mutation: {
    upsertOpenAiModelPrice: (
      _p: unknown,
      args: { input: { model: string; input_per_1m: number; output_per_1m: number } },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, AI_USAGE_WRITE);
      return openAiUsageService.upsertPrice(args.input);
    },
  },
};

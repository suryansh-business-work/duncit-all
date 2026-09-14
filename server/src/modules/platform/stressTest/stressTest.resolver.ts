import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { stressTestService } from './stressTest.service';
import { stressTestCi } from './stressTest.ci';
import { generateStressVerdict } from './stressTest.verdict';

// A Tech-portal capability. The runners authenticate with the same TECH_MANAGER
// JWT the E2E and build workflows use (DUNCIT_RELEASE_TOKEN). Starting a run
// against PRODUCTION additionally needs SUPER_ADMIN — enforced in the service,
// because only the service knows which environment it is.
const STRESS_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const stressTestResolvers = {
  Query: {
    stressRunsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.table(args.query);
    },
    stressRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.run(args.id);
    },
    stressRunSamples: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.samples(args.id);
    },
    stressRunShards: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.live(args.id);
    },
    stressTriggerConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, STRESS_MANAGE);
      return stressTestService.triggerConfig(user);
    },
    stressSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.settings();
    },
    serverPulse: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.pulse();
    },
  },
  Mutation: {
    triggerStressRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, STRESS_MANAGE);
      return stressTestService.trigger(args.input, user);
    },
    stopStressRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, STRESS_MANAGE);
      return stressTestService.stop(args.id, user);
    },
    deleteStressRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.remove(args.id);
    },
    generateStressVerdict: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, STRESS_MANAGE);
      return generateStressVerdict(args.id, user);
    },
    updateStressSettings: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestService.updateSettings(args.input);
    },
    claimStressRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestCi.claim(args.input);
    },
    reportStressRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestCi.report(args.input);
    },
    finishStressRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, STRESS_MANAGE);
      return stressTestCi.finish(args.input);
    },
  },
};

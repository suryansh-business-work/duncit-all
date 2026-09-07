import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { e2eRunService } from './e2eRun.service';

// E2E runs are a Tech-portal capability. The workflow authenticates with the
// same TECH_MANAGER JWT the build workflows use (DUNCIT_RELEASE_TOKEN), so its
// reports carry the same gate as the reads.
const E2E_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const e2eRunResolvers = {
  Query: {
    e2eRunsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.table(args.query);
    },
    e2eRunSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.settings();
    },
    e2eSuiteCatalogue: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.suiteCatalogue();
    },
    e2eTriggerConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.triggerConfig();
    },
  },
  Mutation: {
    triggerE2eRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, E2E_MANAGE);
      return e2eRunService.trigger(args.input, user);
    },
    startE2eRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, E2E_MANAGE);
      return e2eRunService.start(args.input, user.email ?? user.id);
    },
    reportE2eRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, E2E_MANAGE);
      return e2eRunService.report(args.input, user.email ?? user.id);
    },
    updateE2eRunSettings: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.updateSettings(args.input);
    },
    deleteE2eRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.remove(args.id);
    },
  },
};

import type { GraphQLContext } from '@context';
import { requireRole, TESTS_MANAGER } from '@middleware/rbac';
import { testsOverview } from './testsOverview.service';
import { liveTestRuns } from './testsOverview.live';
import { getTestsSettings, updateTestsSettings, type TestsSettingsInput } from './testsOverview.settings';

/** The Tests console's own staff; Tech keeps read access to the dashboard it used to host half of. */
const TESTS_READ = ['SUPER_ADMIN', TESTS_MANAGER, 'TECH_MANAGER'];
const TESTS_MANAGE = ['SUPER_ADMIN', TESTS_MANAGER];

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);

export const testsOverviewResolvers = {
  Query: {
    testsOverview: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TESTS_READ);
      return testsOverview();
    },
    testsLiveRuns: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TESTS_READ);
      const { runs, server_now } = await liveTestRuns();
      return {
        runs: runs.map((run) => ({ ...run, started_at: iso(run.started_at) })),
        server_now: server_now.toISOString(),
      };
    },
    testsSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TESTS_MANAGE);
      const settings = await getTestsSettings();
      return { ...settings, updated_at: iso(settings.updated_at) };
    },
  },
  Mutation: {
    updateTestsSettings: async (_p: unknown, args: { input: TestsSettingsInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TESTS_MANAGE);
      const settings = await updateTestsSettings(args.input, user.email ?? user.id);
      return { ...settings, updated_at: iso(settings.updated_at) };
    },
  },
};

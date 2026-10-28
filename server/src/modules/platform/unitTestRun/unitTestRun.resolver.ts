import type { GraphQLContext } from '@context';
import { requireRole, TESTS_MANAGER } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { regressionReportService } from '@modules/platform/regressionReport/regressionReport.service';
import { unitTestRunService } from './unitTestRun.service';
import { unitTestRunReporting } from './unitTestRun.report';
import { pubRun } from './unitTestRun.public';
import type {
  ClaimUnitTestRunInput,
  FinishUnitTestRunInput,
  ReportUnitTestCasesInput,
  ReportUnitTestFilesInput,
  ReportUnitTestWorkspacesInput,
} from './unitTestRun.inputs';

/**
 * Unit runs are a Tests-console capability. TECH_MANAGER stays on every gate
 * because the CI reporters sign in with the TECH_MANAGER release token
 * (DUNCIT_RELEASE_TOKEN), so the reporting mutations carry the same gate as
 * the reads.
 */
const UNIT_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER', TESTS_MANAGER];

const who = (ctx: GraphQLContext): string => {
  const user = requireRole(ctx, UNIT_MANAGE);
  return user.email ?? user.id;
};

type TableArgs = { query?: TableQueryInput | null };
type RunTableArgs = TableArgs & { run_id: string };

export const unitTestRunResolvers = {
  Query: {
    unitTestRunsTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.table(args.query);
    },
    unitTestRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.byId(args.id);
    },
    unitTestCasesTable: (_p: unknown, args: RunTableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.casesTable(args.run_id, args.query);
    },
    unitTestFilesTable: (_p: unknown, args: RunTableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.filesTable(args.run_id, args.query);
    },
    unitTestInventory: (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.inventory(args.query);
    },
    unitTestInventorySummary: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.inventorySummary();
    },
    unitTestCoverageTrend: (_p: unknown, args: { limit?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.coverageTrend(args.limit);
    },
    unitTestSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.settings();
    },
    unitTestTriggerConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.triggerConfig();
    },
  },
  Mutation: {
    startUnitTestRun: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.start(user);
    },
    updateUnitTestSettings: (_p: unknown, args: { input: { retention_runs: number } }, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunService.updateSettings(args.input);
    },
    claimUnitTestRun: async (_p: unknown, args: { input: ClaimUnitTestRunInput }, ctx: GraphQLContext) =>
      pubRun(await unitTestRunReporting.claim(args.input, who(ctx))),
    reportUnitTestWorkspaces: (_p: unknown, args: { input: ReportUnitTestWorkspacesInput }, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunReporting.workspaces(args.input);
    },
    reportUnitTestFiles: (_p: unknown, args: { input: ReportUnitTestFilesInput }, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunReporting.files(args.input);
    },
    reportUnitTestCases: (_p: unknown, args: { input: ReportUnitTestCasesInput }, ctx: GraphQLContext) => {
      requireRole(ctx, UNIT_MANAGE);
      return unitTestRunReporting.cases(args.input);
    },
    finishUnitTestRun: async (_p: unknown, args: { input: FinishUnitTestRunInput }, ctx: GraphQLContext) =>
      pubRun(await unitTestRunReporting.finish(args.input, who(ctx))),
  },
  UnitTestRun: {
    // Resolved only when asked for — the run page does, the table does not.
    regression_report_id: (run: { id: string }) => regressionReportService.idForRun('UNIT', run.id),
  },
};

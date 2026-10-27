import type { GraphQLContext } from '@context';
import { requireRole, TESTS_MANAGER } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { regressionReportService } from './regressionReport.service';

/** Read-only, and the same gate as the unit and E2E runs the reports are built from. */
const REGRESSION_READ = ['SUPER_ADMIN', 'TECH_MANAGER', TESTS_MANAGER];

export const regressionReportResolvers = {
  Query: {
    regressionReportsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, REGRESSION_READ);
      return regressionReportService.table(args.query);
    },
    regressionReport: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, REGRESSION_READ);
      return regressionReportService.byId(args.id);
    },
    regressionReportItemsTable: (
      _p: unknown,
      args: { report_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REGRESSION_READ);
      return regressionReportService.itemsTable(args.report_id, args.query);
    },
  },
};

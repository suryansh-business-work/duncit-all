import { telemetryService } from './telemetry.service';
import type { TableQueryInput } from '@utils/table-query';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Telemetry is managed from the Tech portal.
const TELEMETRY_READ = ['SUPER_ADMIN', 'TECH_MANAGER'];
const TELEMETRY_WRITE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const telemetryResolvers = {
  Query: {
    telemetrySettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.getSettings();
    },
    telemetryDashboard: (_p: unknown, args: { range_days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.dashboard(args.range_days);
    },
    telemetryLogsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.logsTable(args.query);
    },
    bugsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.bugsTable(args.query);
    },
    bug: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.bug(args.id);
    },
  },
  Mutation: {
    updateTelemetrySettings: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, TELEMETRY_WRITE);
      return telemetryService.updateSettings(args.input as Parameters<
        typeof telemetryService.updateSettings
      >[0]);
    },
    updateBugStatus: (
      _p: unknown,
      args: { bug_id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireRole(ctx, TELEMETRY_WRITE);
      return telemetryService.updateBugStatus(args.bug_id, args.status, user.id);
    },
  },
};

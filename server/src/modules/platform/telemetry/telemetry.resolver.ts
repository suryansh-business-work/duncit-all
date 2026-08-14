import { telemetryService } from './telemetry.service';
import type { TableQueryInput } from '@utils/table-query';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// Telemetry is managed from the Tech portal.
const TELEMETRY_READ = ['SUPER_ADMIN', 'TECH_MANAGER'];
const TELEMETRY_WRITE = ['SUPER_ADMIN', 'TECH_MANAGER'];

/**
 * Emptying the whole bug history is not a scoped mistake — nothing restores it.
 * That is narrower than "can triage bugs", so it is held by the one account
 * that answers for the platform (mirrors deleteAllEmailLogs).
 */
const DELETE_ALL_ROLES = ['SUPER_ADMIN'];

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
    bugOccurrences: (
      _p: unknown,
      args: { bug_id: string; limit?: number | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.bugOccurrences(args.bug_id, args.limit);
    },
    bugsExport: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.bugsExport();
    },
    telemetryLogsExport: (
      _p: unknown,
      args: { level?: string | null; limit?: number | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TELEMETRY_READ);
      return telemetryService.logsExport(args.level, args.limit);
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
    deleteBugs: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, TELEMETRY_WRITE);
      return telemetryService.deleteBugs(args.ids, actor);
    },
    deleteAllBugs: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, DELETE_ALL_ROLES);
      return telemetryService.deleteAllBugs(actor);
    },
    importBugs: (
      _p: unknown,
      args: { bugs: Parameters<typeof telemetryService.importBugs>[0] },
      ctx: GraphQLContext,
    ) => {
      const actor = requireRole(ctx, TELEMETRY_WRITE);
      return telemetryService.importBugs(args.bugs, actor);
    },
    importTelemetryLogs: (
      _p: unknown,
      args: { logs: Parameters<typeof telemetryService.importLogs>[0] },
      ctx: GraphQLContext,
    ) => {
      const actor = requireRole(ctx, TELEMETRY_WRITE);
      return telemetryService.importLogs(args.logs, actor);
    },
    /**
     * Rotating the feed key is not a scoped mistake either: every copied URL
     * — a monitor, a script, somebody's bookmark — dies the moment it lands.
     * Same reasoning as deleteAllBugs, so the same single account holds it.
     */
    rotateTelemetryApiKey: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, DELETE_ALL_ROLES);
      return telemetryService.rotatePublicApiKey(actor);
    },
  },
};

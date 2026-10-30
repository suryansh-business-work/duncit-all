import type { GraphQLContext } from '@context';
import { requireRole, TESTS_MANAGER } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { e2eRunService } from './e2eRun.service';
import { e2eScenarioService, type ReportE2eScenariosInput } from './e2eRun.scenarios';
import { purgeE2eRunData } from './e2eRun.purge';
import { latestRunAccountCode } from './e2eRun.codes';
import { trafficKeyForRun } from './e2eRun.traffic';
import { mintE2eGoogleCredential } from './e2eRun.google';
import { grantRunAccountRoles, revokeRunAccountRoles, type GrantE2eRunAccountRolesInput } from './e2eRun.staff';

// The workflow authenticates with the same TECH_MANAGER JWT the build workflows
// use (DUNCIT_RELEASE_TOKEN). What only it calls — run reports, run-account
// codes and credentials, role grants, purges — stays behind this gate alone.
const E2E_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];
// What the E2E pages read and do. They moved from Tech to the Tests console.
const E2E_CONSOLE = [...E2E_MANAGE, TESTS_MANAGER];

export const e2eRunResolvers = {
  Query: {
    e2eRunsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.table(args.query);
    },
    e2eRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.byId(args.id);
    },
    e2eScenarioResultsTable: (
      _p: unknown,
      args: { run_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eScenarioService.table(args.run_id, args.query);
    },
    e2eRunSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.settings();
    },
    e2eSuiteCatalogue: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.suiteCatalogue();
    },
    e2eTriggerConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.triggerConfig();
    },
    e2eOneTimeCode: (
      _p: unknown,
      args: { purpose: string; email?: string | null; phone?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, E2E_MANAGE);
      return latestRunAccountCode(args);
    },
    e2eTrafficKey: (_p: unknown, args: { stamp: string }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return trafficKeyForRun(args.stamp);
    },
    e2eGoogleCredential: (
      _p: unknown,
      args: { email: string; given_name: string; family_name: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, E2E_MANAGE);
      return mintE2eGoogleCredential(args);
    },
  },
  Mutation: {
    triggerE2eRun: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, E2E_CONSOLE);
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
    reportE2eScenarios: (_p: unknown, args: { input: ReportE2eScenariosInput }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eScenarioService.report(args.input);
    },
    e2eVideoUploadAuth: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.videoUploadAuth(args.input);
    },
    attachE2eRunVideos: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return e2eRunService.attachVideos(args.input);
    },
    purgeE2eRunData: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return purgeE2eRunData(args.input);
    },
    grantE2eRunAccountRoles: (_p: unknown, args: { input: GrantE2eRunAccountRolesInput }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return grantRunAccountRoles(args.input);
    },
    revokeE2eRunAccountRoles: (_p: unknown, args: { input: GrantE2eRunAccountRolesInput }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_MANAGE);
      return revokeRunAccountRoles(args.input);
    },
    updateE2eRunSettings: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.updateSettings(args.input);
    },
    deleteE2eRun: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, E2E_CONSOLE);
      return e2eRunService.remove(args.id);
    },
  },
};

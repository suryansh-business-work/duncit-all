import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { appBuildService } from './appBuild.service';
import type { AppBuildPlatform } from './appBuild.model';
import type { TableQueryInput } from '@utils/table-query';

// App builds are a Tech-portal capability. The CI workflows authenticate with
// a TECH_MANAGER JWT (DUNCIT_RELEASE_TOKEN — same convention as release-notify),
// so reportAppBuild carries the same gate as the reads.
const BUILDS_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const appBuildResolvers = {
  Query: {
    appBuildsTable: (
      _p: unknown,
      args: { platform: AppBuildPlatform; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.table(args.platform, args.query);
    },
    appBuildSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.settings();
    },
  },
  Mutation: {
    reportAppBuild: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.report(args.input, user.email ?? user.id);
    },
    appBuildUploadAuth: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.uploadAuth();
    },
    updateAppBuildSettings: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.updateSettings(args.input);
    },
  },
};

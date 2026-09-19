import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { appBuildService } from './appBuild.service';
import type { AppBuildPlatform, AppStoreTrack, PlayStoreTrack } from './appBuild.model';
import {
  generateIosSigning,
  iosSigningBundle,
  iosSigningFile,
  iosSigningForBuild,
  type IosSigningFileKind,
} from './iosSigning.service';
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
    appBuildTriggerConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.triggerConfig();
    },
    iosSigningForBuild: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return iosSigningForBuild(args.id);
    },
    iosSigningBundle: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return iosSigningBundle(user.email ?? user.id);
    },
  },
  Mutation: {
    reportAppBuild: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.report(args.input, user.email ?? user.id);
    },
    triggerAppBuild: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.trigger(args.input, user);
    },
    appBuildUploadAuth: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.uploadAuth(user.id);
    },
    issueAppBuildCiToken: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.ciToken(user);
    },
    updateAppBuildSettings: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.updateSettings(args.input);
    },
    deleteAppBuild: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.remove(args.id);
    },
    pushAppBuildToPlayStore: (
      _p: unknown,
      args: { id: string; track: PlayStoreTrack },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.pushToPlayStore(args.id, args.track, user);
    },
    pushAppBuildToAppStore: (
      _p: unknown,
      args: { id: string; track: AppStoreTrack },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return appBuildService.pushToAppStore(args.id, args.track, user);
    },
    generateIosSigning: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return generateIosSigning(user.email ?? user.id);
    },
    downloadIosSigningFile: (
      _p: unknown,
      args: { id: string; kind: IosSigningFileKind },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, BUILDS_MANAGE);
      return iosSigningFile(args.id, args.kind, user.email ?? user.id);
    },
  },
};

import { getUrlConfigs } from '@config/url-configs';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
// Same guard as the Tech web terminal and the data clone: an archive is every
// record the platform holds, and a restore rewrites the live database. Both sit
// at the portal's top role.
import { TECH_EXEC } from '../tech/tech.resolver';
import { dbRestoreService } from './dbBackup.restore';
import { dbBackupUploadService } from './dbBackup.upload';
import { dbBackupService, type SaveBackupSettingsInput } from './dbBackup.service';
import { DOWNLOAD_TTL_SECONDS, downloadRoutePath } from './dbBackup.router';

interface SettingsArgs {
  input: {
    enabled: boolean;
    frequency: string;
    timeOfDay: string;
    weekday: number;
    keepLast: number;
  };
}

/** GraphQL's camelCase input onto the service's snake_case field names. */
const toServiceInput = (input: SettingsArgs['input']): SaveBackupSettingsInput => ({
  enabled: input.enabled,
  frequency: input.frequency,
  time_of_day: input.timeOfDay,
  weekday: input.weekday,
  keep_last: input.keepLast,
});

export const dbBackupResolvers = {
  Query: {
    dbBackupsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, TECH_EXEC);
      return dbBackupService.table(args.query);
    },
    dbBackupSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dbBackupService.settings();
    },
    dbRestoreJob: (_p: unknown, args: { id?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dbRestoreService.restoreJob(args.id);
    },
  },
  Mutation: {
    runDbBackup: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return dbBackupService.runNow(user);
    },
    saveDbBackupSettings: (_p: unknown, args: SettingsArgs, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dbBackupService.saveSettings(toServiceInput(args.input));
    },
    deleteDbBackup: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dbBackupService.remove(args.id);
    },
    async requestDbBackupDownload(_p: unknown, args: { id: string }, ctx: GraphQLContext) {
      requireRole(ctx, TECH_EXEC);
      const token = await dbBackupService.downloadToken(args.id);
      const backup = await dbBackupService.fileFor(args.id);
      const { serverUrl } = await getUrlConfigs();
      const base = serverUrl.replace(/\/$/, '');
      return {
        url: `${base}${downloadRoutePath()}?token=${encodeURIComponent(token)}`,
        fileName: backup?.file_name ?? '',
        expiresInSeconds: DOWNLOAD_TTL_SECONDS,
      };
    },
    dbBackupUploadAuth: (_p: unknown, args: { fileName: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return dbBackupUploadService.auth(user, args.fileName);
    },
    completeDbBackupUpload: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_EXEC);
      return dbBackupUploadService.complete(args.id);
    },
    restoreDbBackup: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_EXEC);
      return dbRestoreService.start(args.id, user);
    },
  },
};

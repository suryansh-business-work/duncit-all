import { uploadSettingService, mediaScanService, type UpdateUploadSettingInput } from './uploadSetting.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

// Same access split as the settings module: any admin portal role can read,
// only platform owners can write.
const ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'TECH_MANAGER'];
const ADMIN_WRITE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const uploadSettingResolvers = {
  Query: {
    uploadSettings: (_p: unknown, args: { surface: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return uploadSettingService.get(args.surface);
    },
    allUploadSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return uploadSettingService.list();
    },
    mediaScanLogsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return mediaScanService.table(args.query);
    },
  },
  Mutation: {
    updateUploadSettings: (
      _p: unknown,
      args: { surface: string; input: UpdateUploadSettingInput },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return uploadSettingService.update(args.surface, args.input);
    },
  },
};

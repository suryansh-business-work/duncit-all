import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { aiMonitoringSettingService, mediaScanService } from './aiMonitoring.service';

// The AI portal owns AI Monitoring; platform admins keep read access so an
// upload complaint can be traced without an AI seat.
const MONITORING_READ = ['SUPER_ADMIN', 'AI_MANAGER', 'TECH_MANAGER'];
const MONITORING_WRITE = ['SUPER_ADMIN', 'AI_MANAGER'];

export const aiMonitoringResolvers = {
  Query: {
    // Deliberately unauthenticated: this is the safety notice shown BESIDE an
    // upload field, and a field that cannot say what happens to your file until
    // a session resolves is worse than no notice at all.
    aiMonitoringConfig: () => aiMonitoringSettingService.publicConfig(),
    aiMonitoringSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MONITORING_READ);
      return aiMonitoringSettingService.adminSettings();
    },
    aiMonitoringLogsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MONITORING_READ);
      return mediaScanService.table(args.query);
    },
  },
  Mutation: {
    updateAiMonitoringSettings: (
      _p: unknown,
      args: { input: Parameters<typeof aiMonitoringSettingService.update>[0] },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, MONITORING_WRITE);
      return aiMonitoringSettingService.update(args.input);
    },
  },
};

import { communicationLogService } from './communicationLog.service';
import type { CommsLogEntity, CommsLogType } from './communicationLog.model';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const CRM_READ = ['SUPER_ADMIN', 'CRM_MANAGER', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

export const communicationLogResolvers = {
  Query: {
    communicationLogs: async (
      _p: unknown,
      args: {
        filter?: {
          entity_type?: CommsLogEntity | null;
          entity_id?: string | null;
          type?: CommsLogType | null;
          status?: string | null;
          search?: string | null;
          from_date?: string | null;
          to_date?: string | null;
        } | null;
        limit?: number | null;
        offset?: number | null;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CRM_READ);
      return communicationLogService.list(args.filter ?? {}, {
        limit: args.limit ?? null,
        offset: args.offset ?? null,
      });
    },
    communicationLog: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, CRM_READ);
      return communicationLogService.get(args.id);
    },
  },
  Mutation: {
    requestCommunicationTranscript: async (
      _p: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CRM_READ);
      return communicationLogService.requestTranscript(args.id);
    },
  },
};

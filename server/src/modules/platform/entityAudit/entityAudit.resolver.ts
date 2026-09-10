import { requireRole } from '@middleware/rbac';
import type { GraphQLContext } from '@context';
import type { TableQueryInput } from '@utils/table-query';
import { entityAuditService } from './entityAudit.service';
import type { EntityAuditType } from './entityAudit.model';

/**
 * Who may read a record's history: exactly whoever may open the console that
 * shows it. Gating the log more tightly than the page it is a tab of would
 * offer an admin a tab they cannot read; gating it more loosely would leak a
 * partner's bank details through the "Old Data" column.
 */
const PLATFORM_ADMINS = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

const AUDIT_ROLES: Record<EntityAuditType, string[]> = {
  VENUE: [...PLATFORM_ADMINS, 'ONBOARDING_MANAGER', 'ALL_VENUES_ACCESS'],
  HOST: [...PLATFORM_ADMINS, 'ONBOARDING_MANAGER', 'ALL_HOSTS_ACCESS'],
  CLUB: [...PLATFORM_ADMINS, 'ALL_CLUBS_ACCESS'],
  CLUB_ADMIN: [...PLATFORM_ADMINS, 'ONBOARDING_MANAGER', 'ALL_CLUB_ADMINS_ACCESS'],
  REGION: [...PLATFORM_ADMINS, 'ALL_CLUB_ADMINS_ACCESS', 'REGIONAL_CLUB_ADMIN'],
};

export const entityAuditResolvers = {
  Query: {
    entityChangeLogsTable: async (
      _p: unknown,
      args: { entity_type: EntityAuditType; entity_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AUDIT_ROLES[args.entity_type]);
      return entityAuditService.table(args.entity_type, args.entity_id, args.query);
    },

    entityChangeFeedTable: async (
      _p: unknown,
      args: { entity_type: EntityAuditType; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AUDIT_ROLES[args.entity_type]);
      return entityAuditService.tableForType(args.entity_type, args.query);
    },
  },
};

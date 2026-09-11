import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { hasRole, requireRole } from '@middleware/rbac';
import type { GraphQLContext } from '@context';
import type { TableQueryInput } from '@utils/table-query';
import { RegionModel } from '@modules/clubs/region/region.model';
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

/**
 * A REGIONAL_CLUB_ADMIN may read their OWN region's history and no other.
 *
 * Every other entity here is read by staff whose job is the whole directory, so
 * the role IS the scope. A Regional Club Admin is not staff: they hold one
 * region, the console they open is that region, and the role alone would have let
 * them read any region's trail by changing the id in the URL. Anybody who also
 * holds a directory role is unaffected — this only narrows the regional role.
 */
async function assertRegionScope(entityId: string, ctx: GraphQLContext): Promise<void> {
  const roles = [...PLATFORM_ADMINS, 'ALL_CLUB_ADMINS_ACCESS'];
  if (ctx.user && hasRole(ctx.user, roles)) return;
  if (!Types.ObjectId.isValid(entityId)) {
    throw new GraphQLError('Region not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const region = await RegionModel.findById(entityId).select('manager_user_id').lean();
  if (!region || String(region.manager_user_id) !== ctx.user?.id) {
    throw new GraphQLError('That is not your region', { extensions: { code: 'FORBIDDEN' } });
  }
}

export const entityAuditResolvers = {
  Query: {
    entityChangeLogsTable: async (
      _p: unknown,
      args: { entity_type: EntityAuditType; entity_id: string; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AUDIT_ROLES[args.entity_type]);
      if (args.entity_type === 'REGION') await assertRegionScope(args.entity_id, ctx);
      return entityAuditService.table(args.entity_type, args.entity_id, args.query);
    },

    entityChangeFeedTable: async (
      _p: unknown,
      args: { entity_type: EntityAuditType; query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      // The console-wide feed spans every record of the entity, so the regional
      // role cannot have it at all — there is no "own region" to narrow it to.
      const roles =
        args.entity_type === 'REGION'
          ? [...PLATFORM_ADMINS, 'ALL_CLUB_ADMINS_ACCESS']
          : AUDIT_ROLES[args.entity_type];
      requireRole(ctx, roles);
      return entityAuditService.tableForType(args.entity_type, args.query);
    },
  },
};

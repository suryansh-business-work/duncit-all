import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { HR_ROLES } from '@modules/hr/hr.roles';
import { hrSettingsService } from './hrSettings.service';

export const hrSettingsResolvers = {
  Query: {
    hrSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, HR_ROLES);
      return hrSettingsService.pub();
    },
  },
  Mutation: {
    updateHrSettings: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      hrSettingsService.update(args.input ?? {}, requireRole(ctx, HR_ROLES).id),
  },
};

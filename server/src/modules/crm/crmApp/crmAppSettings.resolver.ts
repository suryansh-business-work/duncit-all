import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { crmAppSettings, updateCrmAppSettings } from './crmAppSettings.service';

export const crmAppSettingsResolvers = {
  Query: {
    crmAppSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, [...CRM_RW]);
      return crmAppSettings();
    },
  },
  Mutation: {
    updateCrmAppSettings: (
      _p: unknown,
      args: { input: { security_verification?: boolean | null } },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, [...CRM_RW]);
      return updateCrmAppSettings(args.input, user);
    },
  },
};

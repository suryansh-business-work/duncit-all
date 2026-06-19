import { founderService } from './founder.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

export const founderResolvers = {
  Query: {
    founderDashboard: (
      _p: unknown,
      args: { from?: string | null; to?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return founderService.dashboard(args.from, args.to);
    },
  },
  Mutation: {
    saveFounderSetting: (
      _p: unknown,
      args: { input: { key: string; value: number } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return founderService.saveSetting(args.input.key, args.input.value);
    },
  },
};

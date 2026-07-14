import { managedOptionService } from './managedOption.service';
import type { ManagedOptionGroup } from './managedOption.model';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const managedOptionResolvers = {
  Query: {
    crmManagedOptions: (
      _p: unknown,
      args: { group: ManagedOptionGroup; include_inactive?: boolean | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return managedOptionService.list(args.group, args.include_inactive ?? false);
    },
    crmManagedOptionsTable: (
      _p: unknown,
      args: { group: ManagedOptionGroup; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return managedOptionService.table(args.group, args.query);
    },
  },
  Mutation: {
    createCrmManagedOption: (
      _p: unknown,
      args: { input: { name: string; group: ManagedOptionGroup; sort_order?: number | null; is_active?: boolean | null } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return managedOptionService.create(args.input);
    },
    updateCrmManagedOption: (
      _p: unknown,
      args: { id: string; input: { name?: string | null; sort_order?: number | null; is_active?: boolean | null } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return managedOptionService.update(args.id, args.input);
    },
    deleteCrmManagedOption: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return managedOptionService.remove(args.id);
    },
  },
};

import { serviceOfferedService, type ServiceOfferedFilter } from './serviceOffered.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const serviceOfferedResolvers = {
  Query: {
    crmServicesOffered: (_p: unknown, args: { filter?: ServiceOfferedFilter | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return serviceOfferedService.list(args.filter ?? {});
    },
  },
  Mutation: {
    createCrmServicesOffered: (
      _p: unknown,
      args: {
        input: {
          super_category_id: string;
          category_id?: string | null;
          sub_category_id?: string | null;
          applies_to_venue?: boolean | null;
          applies_to_host?: boolean | null;
          titles: string[];
        };
      },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return serviceOfferedService.createMany(args.input, user.id);
    },
    updateCrmServiceOffered: (
      _p: unknown,
      args: {
        id: string;
        input: {
          title?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          applies_to_venue?: boolean | null;
          applies_to_host?: boolean | null;
        };
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return serviceOfferedService.update(args.id, args.input);
    },
    deleteCrmServiceOffered: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return serviceOfferedService.remove(args.id);
    },
  },
};

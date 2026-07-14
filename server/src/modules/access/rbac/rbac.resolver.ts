import { rbacService } from './rbac.service';
import { requireRole } from '@middleware/rbac';
import type { GraphQLContext } from '@context';

const READ_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'] as const;
const ADMIN_ROLES = ['SUPER_ADMIN'] as const;

export const rbacResolvers = {
  Query: {
    roles: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.listRoles();
    },
    rolesTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.table(args.query);
    },
    role: async (_p: unknown, args: { role_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.getRole(args.role_id);
    },
    publicRoles: async () => {
      const roles = await rbacService.listRoles();
      return roles.map((r: any) => ({
        key: r.key,
        name: r.name,
        description: r.description ?? '',
      }));
    },
  },
  Mutation: {
    createRole: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.createRole(args.input);
    },
    updateRole: (_p: unknown, args: { role_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.updateRole(args.role_id, args.input);
    },
    deleteRole: (_p: unknown, args: { role_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.deleteRole(args.role_id);
    },
  },
};

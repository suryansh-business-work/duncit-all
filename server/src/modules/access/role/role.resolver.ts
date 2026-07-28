import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ROLE_ASSIGN_ROLES = ['SUPER_ADMIN'];

export const userRoleResolvers = {
  Mutation: {
    assignUserRoles: async (
      _p: unknown,
      args: { user_id: string; role_keys: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ROLE_ASSIGN_ROLES);
      return userService.assignRoles(args.user_id, args.role_keys);
    },
    addUserRole: async (
      _p: unknown,
      args: { user_id: string; role_key: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ROLE_ASSIGN_ROLES);
      return userService.addRole(args.user_id, args.role_key);
    },
    removeUserRole: async (
      _p: unknown,
      args: { user_id: string; role_key: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ROLE_ASSIGN_ROLES);
      return userService.removeRole(args.user_id, args.role_key);
    },
    grantAdminAccess: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ROLE_ASSIGN_ROLES);
      return userService.grantAdmin(args.user_id);
    },
    revokeAdminAccess: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ROLE_ASSIGN_ROLES);
      return userService.revokeAdmin(args.user_id);
    },
  },
};

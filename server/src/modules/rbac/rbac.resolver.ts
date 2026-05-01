import { rbacService } from './rbac.service';
import { requireRole } from '../../middleware/rbac';
import type { GraphQLContext } from '../../context';

const READ_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'] as const;
const ADMIN_ROLES = ['SUPER_ADMIN'] as const;

export const rbacResolvers = {
  Query: {
    resources: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.listResources();
    },
    actions: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.listActions();
    },
    permissions: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.listPermissions();
    },
    roles: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.listRoles();
    },
    role: async (_p: unknown, args: { role_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return rbacService.getRole(args.role_id);
    },
  },
  Mutation: {
    createResource: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.createResource(args.input);
    },
    updateResource: (_p: unknown, args: { resource_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.updateResource(args.resource_id, args.input);
    },
    deleteResource: (_p: unknown, args: { resource_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.deleteResource(args.resource_id);
    },

    createAction: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.createAction(args.input);
    },
    updateAction: (_p: unknown, args: { action_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.updateAction(args.action_id, args.input);
    },
    deleteAction: (_p: unknown, args: { action_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.deleteAction(args.action_id);
    },

    createPermission: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.createPermission(args.input);
    },
    deletePermission: (_p: unknown, args: { permission_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.deletePermission(args.permission_id);
    },

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
    setRolePermissions: (
      _p: unknown,
      args: { role_id: string; permission_keys: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return rbacService.setRolePermissions(args.role_id, args.permission_keys);
    },
  },
};

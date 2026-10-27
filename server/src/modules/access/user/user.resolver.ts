import { userService } from './user.service';
import {
  createUserSchema,
  updateUserSchema,
  recordUserContactActionSchema,
  startRecordedUserCallSchema,
} from './user.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { requireRole, assertScope, readScope, hasRole } from '@middleware/rbac';
import { loadUserDataIssues, type ContactRow } from './user.data-issues';
import { loadLastActiveOn } from './user.last-active';
import { ROLE_ASSIGNERS } from './user.constants';

/**
 * Assigning roles is a Super Admin's (ROLE_ASSIGNERS, as assignUserRoles):
 * anyone else who may create or edit users creates plain members and never
 * changes a user's roles — or a City Admin could hand out any console role.
 */
function assertMayAssignRoles(actor: AuthUser, requested: readonly string[] | undefined, current: readonly string[]) {
  if (requested === undefined || hasRole(actor, ROLE_ASSIGNERS)) return;
  const want = new Set(requested.map((role) => role.toUpperCase()));
  const have = new Set(current.map((role) => role.toUpperCase()));
  const unchanged = want.size === have.size && [...want].every((role) => have.has(role));
  if (!unchanged) {
    throw new GraphQLError('Only a Super Admin can assign roles', { extensions: { code: 'FORBIDDEN' } });
  }
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const MUTATING_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];
// The user directory is also read by the Marketing portal to target
// per-user push notifications (read-only — no other user ops are granted).
const DIRECTORY_ROLES = [...ADMIN_ROLES, 'MARKETING_MANAGER'];
// Onboarding managers browse the partner directory to see Club Admins onboarded
// via the approval flow (Club Admin has no drafted entity of its own).
const PARTNERS_TABLE_ROLES = [...DIRECTORY_ROLES, 'ONBOARDING_MANAGER'];

export const userResolvers = {
  User: {
    interest_categories: async (parent: any) =>
      userService.getInterestCategories(parent.interest_category_ids ?? []),
    // Whether another account holds your number is not yours to read — staff only.
    data_issues: (parent: ContactRow, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      return loadUserDataIssues(ctx, parent);
    },
    last_active_on: (parent: { user_id: string }, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      return loadLastActiveOn(ctx, parent.user_id);
    },
  },
  Query: {
    users: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      // A city or zonal admin reads their own city's / zones' members only.
      return userService.list(args.filter, readScope(ctx));
    },
    usersTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      // A city or zonal admin reads their own city's / zones' members only.
      return userService.table(args.query, readScope(ctx));
    },
    partnersTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, PARTNERS_TABLE_ROLES);
      return userService.partnersTable(args.query, readScope(ctx));
    },
    user: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      const target = await userService.getById(args.user_id);
      // The same place check updateUser makes: a read never sees what a write would refuse.
      if (target) assertScope(ctx, { city: target.city, zone: target.zone });
      return target;
    },
    userContactActions: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.listContactActions(args.user_id);
    },
    userContactActionsTable: async (
      _p: unknown,
      args: { user_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.contactActionsTable(args.user_id, args.query);
    },
  },
  Mutation: {
    createUser: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, MUTATING_ROLES);
      const data = await validate(createUserSchema, args.input);
      assertScope(ctx, { city: data.city, zone: data.zone });
      assertMayAssignRoles(actor, data.roles as string[] | undefined, ['USER']);
      return userService.create(data as any);
    },
    recordUserContactAction: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      const data = await validate(recordUserContactActionSchema, args.input);
      return userService.recordContactAction(data, ctx.user?.id ?? null);
    },
    startRecordedUserCall: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      const data = await validate(startRecordedUserCallSchema, args.input);
      return userService.startRecordedCall(data, ctx.user?.id ?? null);
    },
    deleteUserContactAction: async (_p: unknown, args: { action_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.deleteContactAction(args.action_id);
    },
    updateUser: async (
      _p: unknown,
      args: { user_id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, MUTATING_ROLES);
      const data = await validate(updateUserSchema, args.input);
      const target = await userService.getById(args.user_id);
      if (target) assertScope(ctx, { city: target.city, zone: target.zone });
      assertMayAssignRoles(actor, data.roles as string[] | undefined, (target?.roles as string[] | undefined) ?? []);
      return userService.update(args.user_id, data as any);
    },
    deleteUser: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, ['SUPER_ADMIN', 'CITY_ADMIN']);
      const target = await userService.getById(args.user_id);
      if (target) assertScope(ctx, { city: target.city, zone: target.zone });
      if (actor.id === args.user_id) return false;
      return userService.remove(args.user_id);
    },
  },
};

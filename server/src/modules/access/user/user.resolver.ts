import { userService } from './user.service';
import {
  createUserSchema,
  updateUserSchema,
  recordUserContactActionSchema,
  startRecordedUserCallSchema,
} from './user.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { requireRole, assertScope } from '@middleware/rbac';

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
  },
  Query: {
    users: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      return userService.list(args.filter);
    },
    usersTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      return userService.table(args.query);
    },
    partnersTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, PARTNERS_TABLE_ROLES);
      return userService.partnersTable(args.query);
    },
    user: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.getById(args.user_id);
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
      requireRole(ctx, MUTATING_ROLES);
      const data = await validate(createUserSchema, args.input);
      assertScope(ctx, { city: data.city, zone: data.zone });
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
      requireRole(ctx, MUTATING_ROLES);
      const data = await validate(updateUserSchema, args.input);
      const target = await userService.getById(args.user_id);
      if (target) assertScope(ctx, { city: target.city, zone: target.zone });
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

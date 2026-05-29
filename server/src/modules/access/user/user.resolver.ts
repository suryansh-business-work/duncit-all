import { userService } from './user.service';
import {
  loginSchema,
  registerSchema,
  googleSignupSchema,
  createUserSchema,
  updateUserSchema,
  updateMyProfileSchema,
  petProfileSchema,
  interestCategoryIdsSchema,
  recordUserContactActionSchema,
  startRecordedUserCallSchema,
} from './user.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { requireRole, assertScope } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const MUTATING_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];
const ROLE_ASSIGN_ROLES = ['SUPER_ADMIN'];

function toPublicProfile(u: any) {
  if (!u) return null;
  return {
    user_id: u.user_id,
    full_name: u.full_name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    profile_photo: u.profile_photo ?? null,
    bio: u.bio ?? null,
    city: u.city ?? null,
    zone: u.zone ?? null,
  };
}

export const userResolvers = {
  User: {
    interest_categories: async (parent: any) =>
      userService.getInterestCategories(parent.interest_category_ids ?? []),
  },
  Query: {
    me: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return null;
      return userService.me(ctx.user.id);
    },
    mySavedPods: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.listSavedPods(ctx.user.id);
    },
    users: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.list(args.filter);
    },
    user: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.getById(args.user_id);
    },
    userContactActions: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return userService.listContactActions(args.user_id);
    },
    publicUsersByIds: async (_p: unknown, args: { user_ids: string[] }) => {
      const ids = (args.user_ids ?? []).filter(Boolean);
      if (ids.length === 0) return [];
      const users = await Promise.all(ids.map((id) => userService.getById(id).catch(() => null)));
      return users.filter(Boolean).map(toPublicProfile);
    },
    publicUserProfile: async (_p: unknown, args: { user_id: string }) => {
      const u = await userService.getById(args.user_id).catch(() => null);
      return u ? toPublicProfile(u) : null;
    },
  },
  Mutation: {
    register: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(registerSchema, args.input);
      return userService.register(data);
    },
    login: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(loginSchema, args.input);
      return userService.login(data);
    },
    loginWithGoogle: async (_p: unknown, args: { input: { id_token: string } }) => {
      return userService.loginWithGoogle(args.input?.id_token);
    },
    signupWithGoogle: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(googleSignupSchema, args.input);
      return userService.signupWithGoogle(data);
    },
    updateMyProfile: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(updateMyProfileSchema, args.input);
      return userService.updateMyProfile(ctx.user.id, data);
    },
    requestEmailVerificationOtp: async (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.requestEmailVerificationOtp(ctx.user.id);
    },
    verifyEmailVerificationOtp: async (_p: unknown, args: { otp: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.verifyEmailVerificationOtp(ctx.user.id, args.otp);
    },
    updateMyPetProfile: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(petProfileSchema, args.input);
      return userService.updateMyPetProfile(ctx.user.id, data);
    },
    updateMyInterests: async (_p: unknown, args: { category_ids: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const categoryIds = await validate(interestCategoryIdsSchema, args.category_ids);
      return userService.updateMyInterests(ctx.user.id, categoryIds as string[]);
    },
    toggleSavedPod: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.toggleSavedPod(ctx.user.id, args.pod_doc_id);
    },
    followPod: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.followPod(ctx.user.id, args.pod_id);
    },
    unfollowPod: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.unfollowPod(ctx.user.id, args.pod_id);
    },
    followClub: async (_p: unknown, args: { club_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.followClub(ctx.user.id, args.club_id);
    },
    unfollowClub: async (_p: unknown, args: { club_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.unfollowClub(ctx.user.id, args.club_id);
    },
    followUser: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.followUser(ctx.user.id, args.user_id);
    },
    unfollowUser: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.unfollowUser(ctx.user.id, args.user_id);
    },
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
    seedSuperAdmin: async () => {
      return userService.seedSuperAdmin();
    },
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
  },
};

import { userService } from './user.service';
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  requestPasswordChangeSchema,
  changePasswordSchema,
  deleteMyAccountSchema,
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
// The user directory is also read by the Marketing portal to target
// per-user push notifications (read-only — no other user ops are granted).
const DIRECTORY_ROLES = [...ADMIN_ROLES, 'MARKETING_MANAGER'];

// A stable @handle for follow lists. There is no real username field yet, so we
// derive one from the name plus a short id suffix (kept deterministic + unique).
function deriveUsername(u: any): string {
  const base = String(u.first_name || u.full_name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const suffix = String(u.user_id ?? '').slice(-4);
  return `${base || 'user'}${suffix}`;
}

// Shape a public profile and apply privacy. A PRIVATE profile hides its
// bio/city/zone (and, via can_view_content, its posts/stories) from anyone who
// is not the owner or a follower. Name + avatar always stay visible.
function toPublicProfile(u: any, viewerId: string | null = null, isFollowing = false) {
  if (!u) return null;
  const isPrivate = (u.profile_visibility ?? 'PUBLIC') === 'PRIVATE';
  const isOwner = !!viewerId && viewerId === u.user_id;
  const canView = isOwner || !isPrivate || isFollowing;
  return {
    user_id: u.user_id,
    username: deriveUsername(u),
    full_name: u.full_name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    profile_photo: u.profile_photo ?? null,
    bio: canView ? (u.bio ?? null) : null,
    city: canView ? (u.city ?? null) : null,
    zone: canView ? (u.zone ?? null) : null,
    followers_count: u.followers_count ?? 0,
    following_count: u.following_count ?? 0,
    is_private: isPrivate,
    is_following: isFollowing,
    can_view_content: canView,
  };
}

// Resolve a list of user ids to public profiles, tagging which ones the viewer
// already follows (drives the Follow/Following button in the follow lists).
async function mapPublicProfiles(ids: string[], viewerId: string | null) {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return [];
  const users = await Promise.all(clean.map((id) => userService.getById(id).catch(() => null)));
  const following = viewerId
    ? new Set(await userService.listFollowingUserIds(viewerId))
    : new Set<string>();
  return users
    .filter(Boolean)
    .map((u) => toPublicProfile(u, viewerId, following.has((u as any).user_id)));
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
    mySavedPods: async (
      _p: unknown,
      args: { search?: string | null; category_id?: string | null; sort?: string | null },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.listSavedPods(ctx.user.id, {
        search: args.search,
        categoryId: args.category_id,
        sort: args.sort,
      });
    },
    users: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      return userService.list(args.filter);
    },
    usersTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, DIRECTORY_ROLES);
      return userService.table(args.query);
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
    publicUsersByIds: async (_p: unknown, args: { user_ids: string[] }, ctx: GraphQLContext) =>
      mapPublicProfiles(args.user_ids ?? [], ctx.user?.id ?? null),
    publicUserProfile: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const u = await userService.getById(args.user_id).catch(() => null);
      if (!u) return null;
      const viewerId = ctx.user?.id ?? null;
      const isFollowing = viewerId ? await userService.isFollowing(viewerId, u.user_id) : false;
      return toPublicProfile(u, viewerId, isFollowing);
    },
    followersOf: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const ids = await userService.listFollowerUserIds(args.user_id);
      return mapPublicProfiles(ids, ctx.user?.id ?? null);
    },
    followingOf: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const ids = await userService.listFollowingUserIds(args.user_id);
      return mapPublicProfiles(ids, ctx.user?.id ?? null);
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
    requestPasswordResetOtp: async (_p: unknown, args: { email: string }) => {
      const data = await validate(requestPasswordResetSchema, { email: args.email });
      return userService.requestPasswordResetOtp(data);
    },
    resetPasswordWithOtp: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(resetPasswordSchema, args.input);
      return userService.resetPasswordWithOtp(data);
    },
    requestPasswordChangeOtp: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(requestPasswordChangeSchema, args.input);
      return userService.requestPasswordChangeOtp(ctx.user.id, data);
    },
    changePasswordWithOtp: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(changePasswordSchema, args.input);
      return userService.changePasswordWithOtp(ctx.user.id, data);
    },
    requestAccountDeletionOtp: async (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.requestAccountDeletionOtp(ctx.user.id);
    },
    deleteMyAccount: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(deleteMyAccountSchema, args.input);
      return userService.deleteMyAccount(ctx.user.id, data);
    },
    loginWithGoogle: async (
      _p: unknown,
      args: { input: { id_token: string; portal_key?: string | null } }
    ) => {
      return userService.loginWithGoogle(args.input?.id_token, args.input?.portal_key);
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
    updateMyProfileVisibility: async (
      _p: unknown,
      args: { visibility: 'PUBLIC' | 'PRIVATE' },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.updateMyProfileVisibility(ctx.user.id, args.visibility);
    },
    setMySelectedLocation: async (
      _p: unknown,
      args: { location_id?: string | null },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.setMySelectedLocation(ctx.user.id, args.location_id ?? null);
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

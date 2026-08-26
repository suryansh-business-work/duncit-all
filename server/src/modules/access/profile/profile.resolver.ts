import { userService } from '@modules/access/user/user.service';
import {
  updateMyProfileSchema,
  petProfileSchema,
  interestCategoryIdsSchema,
} from './profile.validator';
import { validate } from '@utils/validate';
import { assertEligibleDob } from '@utils/age';
import type { GraphQLContext } from '@context';

/**
 * The @handle to render for a profile.
 *
 * Accounts now STORE one (profile.username, minted at signup). The derivation
 * below is only what an account created before that field existed reads as
 * until `migrate:usernames` has run — deterministic and unique because it
 * ends in the id's own tail, so a follow list never shows two blank handles.
 */
function displayUsername(u: any): string {
  if (u.username) return String(u.username);
  const base = String(u.first_name || u.full_name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const suffix = String(u.user_id ?? '').slice(-4);
  return `${base || 'user'}${suffix}`;
}

// Shape a public profile and apply privacy. A PRIVATE profile hides its
// bio/city/zone (and, via can_view_content, its posts/stories) from anyone who
// is not the owner or a follower. Name + avatar always stay visible.
/**
 * Both directions of the pair, as seen from the viewer. The viewer→user half
 * drives the Follow button; the user→viewer half is what turns it into Follow
 * Back and what lets the profile answer an open ask.
 */
interface ViewerRelation {
  isFollowing: boolean;
  hasRequested: boolean;
  followsViewer: boolean;
  inboundRequestId: string | null;
}

const NO_RELATION: ViewerRelation = {
  isFollowing: false,
  hasRequested: false,
  followsViewer: false,
  inboundRequestId: null,
};

function toPublicProfile(u: any, viewerId: string | null = null, rel: ViewerRelation = NO_RELATION) {
  if (!u) return null;
  const { isFollowing, hasRequested } = rel;
  const isPrivate = (u.profile_visibility ?? 'PUBLIC') === 'PRIVATE';
  const isOwner = !!viewerId && viewerId === u.user_id;
  const canView = isOwner || !isPrivate || isFollowing;
  // A pending request grants nothing — it only changes the button. Following
  // still wins outright so an accepted follow can never read as REQUESTED.
  const requested = !isFollowing && hasRequested;
  return {
    user_id: u.user_id,
    username: displayUsername(u),
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
    follow_status: followStatusOf(isFollowing, requested),
    follows_viewer: rel.followsViewer,
    inbound_request_id: rel.inboundRequestId,
    can_view_content: canView,
  };
}

/** The button's three states from the two facts that decide it. Extracted so
 * the ordering (following beats requested) lives in exactly one place. */
function followStatusOf(isFollowing: boolean, requested: boolean) {
  if (isFollowing) return 'FOLLOWING';
  return requested ? 'REQUESTED' : 'NONE';
}

// Resolve a list of user ids to public profiles, tagging which ones the viewer
// already follows (drives the Follow/Following button in the follow lists).
export async function mapPublicProfiles(ids: string[], viewerId: string | null) {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return [];
  const users = await Promise.all(clean.map((id) => userService.getById(id).catch(() => null)));
  // Every set is fetched once for the whole list — a per-row lookup would make
  // a 200-follower list 800 queries.
  const [following, requested, followers, inbound] = viewerId
    ? await Promise.all([
        userService.listFollowingUserIds(viewerId).then((r) => new Set(r)),
        userService.listRequestedUserIds(viewerId).then((r) => new Set(r)),
        userService.listFollowerUserIds(viewerId).then((r) => new Set(r)),
        userService
          .listPendingFollowRequests(viewerId)
          .then((rows) => new Map(rows.map((r) => [r.requester_id, r.id]))),
      ])
    : [new Set<string>(), new Set<string>(), new Set<string>(), new Map<string, string>()];
  return users.filter(Boolean).map((u) => {
    const id = (u as any).user_id;
    return toPublicProfile(u, viewerId, {
      isFollowing: following.has(id),
      hasRequested: requested.has(id),
      followsViewer: followers.has(id),
      inboundRequestId: inbound.get(id) ?? null,
    });
  });
}

export const profileResolvers = {
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
    publicUsersByIds: async (_p: unknown, args: { user_ids: string[] }, ctx: GraphQLContext) =>
      mapPublicProfiles(args.user_ids ?? [], ctx.user?.id ?? null),
    publicUserProfile: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      // Handle first, id second — see userService.getByHandle.
      const u = await userService.getByHandle(args.user_id).catch(() => null);
      if (!u) return null;
      const viewerId = ctx.user?.id ?? null;
      const [status, followsViewer, inboundRequestId] = await Promise.all([
        userService.followStatus(viewerId, u.user_id),
        viewerId ? userService.isFollowing(u.user_id, viewerId) : false,
        viewerId ? userService.pendingFollowRequestId(u.user_id, viewerId) : null,
      ]);
      return toPublicProfile(u, viewerId, {
        isFollowing: status === 'FOLLOWING',
        hasRequested: status === 'REQUESTED',
        followsViewer,
        inboundRequestId,
      });
    },
    usernameAvailability: async (
      _p: unknown,
      args: { username: string },
      ctx: GraphQLContext
    ) => userService.usernameAvailability(args.username, ctx.user?.id ?? null),
    followersOf: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const ids = await userService.listFollowerUserIds(args.user_id);
      return mapPublicProfiles(ids, ctx.user?.id ?? null);
    },
    followingOf: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      const ids = await userService.listFollowingUserIds(args.user_id);
      return mapPublicProfiles(ids, ctx.user?.id ?? null);
    },
    myFollowRequests: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return [];
      const rows = await userService.listPendingFollowRequests(ctx.user.id);
      const profiles = await mapPublicProfiles(
        rows.map((r) => r.requester_id),
        ctx.user.id
      );
      const byId = new Map(profiles.map((p: any) => [p.user_id, p]));
      // A requester whose account has since gone is dropped rather than rendered
      // as an un-answerable row.
      return rows
        .filter((r) => byId.has(r.requester_id))
        .map((r) => ({
          id: r.id,
          requester: byId.get(r.requester_id),
          status: r.status,
          created_at: r.created_at,
        }));
    },
  },
  Mutation: {
    updateMyProfile: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(updateMyProfileSchema, args.input);
      // Same admin-configured age gate as signup — a profile edit must not be a
      // way around it. An omitted/empty dob means "unchanged" and is skipped,
      // and so is a resubmission of the date already on file (raising the
      // minimum must not lock an existing account out of its own profile).
      const current = data.dob ? await userService.me(ctx.user.id) : null;
      await assertEligibleDob(data.dob, current?.dob);
      return userService.updateMyProfile(ctx.user.id, data);
    },
    setMyUsername: async (_p: unknown, args: { username: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.setMyUsername(ctx.user.id, args.username);
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
    setMyLocale: async (_p: unknown, args: { locale: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.setMyLocale(ctx.user.id, args.locale);
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
    acceptFollowRequest: async (_p: unknown, args: { request_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.acceptFollowRequest(ctx.user.id, args.request_id);
    },
    rejectFollowRequest: async (_p: unknown, args: { request_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.rejectFollowRequest(ctx.user.id, args.request_id);
    },
    cancelFollowRequest: async (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.cancelFollowRequest(ctx.user.id, args.user_id);
    },
  },
};

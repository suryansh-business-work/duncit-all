/**
 * `userService` — follows: clubs, pods and users, follow requests for private
 * accounts, and the follow-graph reads. Composed into `userService` in
 * user.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import {
  UserRelationshipModel,
  PodFollowerModel,
  ClubFollowerModel,
  FollowRequestModel,
} from './relations';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { logs } from '@observability/log';
import { emitNotifyForUsers } from '@modules/engagement/notification/notification.events';
import { toPublic } from './user.public';
import { isBlockedEitherWay } from '@modules/access/block/userBlock.model';

/**
 * Tell these users' open inboxes to re-read. Every follow transition changes a
 * LIVE field on rows that already exist — `action_status` once a request is
 * answered or withdrawn, `follow_back_status` once the viewer follows someone
 * from a profile — and nothing writes a new row for those, so without this
 * the inbox on a second device kept offering buttons that would now fail.
 */
function pokeInbox(userIds: string[]) {
  emitNotifyForUsers(userIds, { kind: 'update', unread_count: -1 });
}

export const userFollowMethods = {
  async followClub(user_id: string, clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) {
      throw new GraphQLError('Invalid club', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const club = await ClubModel.findById(clubId).select('_id is_active');
    if (!club?.is_active) {
      throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const oid = new Types.ObjectId(user_id);
    try {
      await ClubFollowerModel.create({ user_id: oid, club_id: club._id });
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_clubs_count': 1 } });
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async unfollowClub(user_id: string, clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) {
      throw new GraphQLError('Invalid club', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const oid = new Types.ObjectId(user_id);
    const res = await ClubFollowerModel.deleteOne({ user_id: oid, club_id: new Types.ObjectId(clubId) });
    if (res.deletedCount) {
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_clubs_count': -1 } });
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async followPod(user_id: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const pod = await PodModel.findById(podId).select('_id is_active');
    if (!pod?.is_active) {
      throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const oid = new Types.ObjectId(user_id);
    try {
      await PodFollowerModel.create({ user_id: oid, pod_id: pod._id });
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_pods_count': 1 } });
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async unfollowPod(user_id: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const oid = new Types.ObjectId(user_id);
    const res = await PodFollowerModel.deleteOne({ user_id: oid, pod_id: new Types.ObjectId(podId) });
    if (res.deletedCount) {
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_pods_count': -1 } });
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async followUser(user_id: string, targetUserId: string) {
    if (user_id === targetUserId) {
      throw new GraphQLError('You cannot follow yourself', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const target = await UserModel.findById(targetUserId).select(
      '_id metadata.status metadata.profile_visibility'
    );
    if (!target || (target as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    // A block either way shuts the door both ways — the blocked member must not
    // be able to follow (or ask to follow) back in.
    if (await isBlockedEitherWay(user_id, targetUserId)) {
      throw new GraphQLError('You cannot follow this account', { extensions: { code: 'FORBIDDEN' } });
    }
    // A PRIVATE profile is asked, not taken: the edge is only written when the
    // owner accepts, so following must never be a side effect of this call.
    // Already-following short-circuits so a stale client cannot downgrade an
    // accepted follow back into a pending request.
    const isPrivate = (target as any).metadata?.profile_visibility === 'PRIVATE';
    if (isPrivate && !(await this.isFollowing(user_id, targetUserId))) {
      await this.requestFollow(user_id, targetUserId);
      return toPublic(await UserModel.findById(user_id));
    }
    return this.createFollowEdge(user_id, targetUserId);
  },

  /** Write the follow edge and move both counters. The single place an edge is
   * born — direct follows of a public profile and accepted requests share it, so
   * the two paths cannot drift on counters or the follower notification.
   *
   * `notify` is off for an accepted request: the accepter already has the
   * FOLLOW_REQUEST row, which turns into "Accepted · Follow Back" the moment
   * they answer. A second row saying the same person now follows them would sit
   * ABOVE it, newer and with nothing to act on — which is precisely how the
   * inbox came to look like it could not follow anybody back. */
  async createFollowEdge(user_id: string, targetUserId: string, notify = true) {
    const followerOid = new Types.ObjectId(user_id);
    const followingOid = new Types.ObjectId(targetUserId);
    let created = false;
    try {
      await UserRelationshipModel.create({
        follower_id: followerOid,
        following_id: followingOid,
      });
      created = true;
      await Promise.all([
        UserModel.updateOne({ _id: followerOid }, { $inc: { 'counters.following_count': 1 } }),
        UserModel.updateOne({ _id: followingOid }, { $inc: { 'counters.followers_count': 1 } }),
      ]);
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
    const updated = await UserModel.findById(user_id);
    const follower = await toPublic(updated);
    if (created && notify) await this.notifyNewFollower(targetUserId, follower);
    // The follower's own rows about this person just lost their Follow Back.
    if (created) pokeInbox([user_id]);
    return follower;
  },

  /** Open (or re-use) a PENDING ask to follow a private profile, and tell the
   * owner about it. Re-asking while one is open is a no-op rather than an error:
   * a double tap must not surface a failure for something already true. */
  async requestFollow(user_id: string, targetUserId: string) {
    const requesterOid = new Types.ObjectId(user_id);
    const targetOid = new Types.ObjectId(targetUserId);
    const open = await FollowRequestModel.findOne({
      requester_id: requesterOid,
      target_id: targetOid,
      status: 'PENDING',
    });
    if (open) return open;
    let request;
    try {
      request = await FollowRequestModel.create({
        requester_id: requesterOid,
        target_id: targetOid,
        status: 'PENDING',
      });
    } catch (e: any) {
      // Lost a race against a concurrent identical ask — the partial unique
      // index did its job, so adopt the winner instead of failing the caller.
      if (e?.code !== 11000) throw e;
      return FollowRequestModel.findOne({
        requester_id: requesterOid,
        target_id: targetOid,
        status: 'PENDING',
      });
    }
    await this.notifyFollowRequest(targetUserId, user_id, String(request._id));
    // The requester's own rows about this person now read "Requested".
    pokeInbox([user_id]);
    return request;
  },

  /** Best-effort actionable notification to the private profile's owner. A
   * failure here must never break the request itself — the row is what counts,
   * and the owner can still answer it from their requests list. */
  async notifyFollowRequest(targetUserId: string, requesterId: string, requestId: string) {
    try {
      const { notificationService } = await import(
        '@modules/engagement/notification/notification.service'
      );
      const requester = await toPublic(await UserModel.findById(requesterId));
      const name = requester?.full_name?.trim() || 'Someone';
      // One row per relationship: a fresh ask replaces the "Denied" (or the
      // older "started following you") the owner still had about this person.
      await notificationService.removeFollowRowsAbout(targetUserId, requesterId);
      await notificationService.create({
        title: 'Follow request',
        body: `${name} wants to follow you`,
        image_url: requester?.profile_photo ?? null,
        link_url: `/u/${requesterId}`,
        action_type: 'FOLLOW_REQUEST',
        action_ref_id: requestId,
        // The recipient's Follow Back acts on this, so the row carries the
        // requester rather than making every read re-derive them.
        action_actor_id: requesterId,
        scope: 'USER',
        target_user_ids: [targetUserId],
      });
    } catch (err) {
      logs.server.error('user.service', 'notifyFollowRequest', {
        error: err,
        msg: 'notifyFollowRequest failed',
        targetUserId,
      });
    }
  },

  /** The owner accepts: the edge is written here and nowhere else in this flow.
   * Only the target may accept, and only a PENDING row — replaying an accept
   * must not double-count a follower. */
  async acceptFollowRequest(user_id: string, requestId: string) {
    const request = await this.resolveOwnedRequest(user_id, requestId);
    await FollowRequestModel.updateOne(
      { _id: request._id, status: 'PENDING' },
      { $set: { status: 'ACCEPTED', resolved_at: new Date() } }
    );
    // No "started following you" row: this notification's own row is the one
    // that now reads "Accepted · Follow Back", and a second, newer row about
    // the same person would bury it with nothing to act on.
    await this.createFollowEdge(String(request.requester_id), user_id, false);
    // The row is not rewritten — its status resolves live — so the accepter's
    // other devices only learn it is answered if told to re-read.
    pokeInbox([user_id]);
    return toPublic(await UserModel.findById(user_id));
  },

  /** The owner rejects: no edge, and the requester's button falls back to
   * Follow. Deliberately silent — a rejection notification would tell the
   * requester something the owner chose not to say. */
  async rejectFollowRequest(user_id: string, requestId: string) {
    const request = await this.resolveOwnedRequest(user_id, requestId);
    await FollowRequestModel.updateOne(
      { _id: request._id, status: 'PENDING' },
      { $set: { status: 'REJECTED', resolved_at: new Date() } }
    );
    pokeInbox([user_id]);
    return toPublic(await UserModel.findById(user_id));
  },

  /** Load a PENDING request the signed-in user is the TARGET of. Anything else
   * — missing, already answered, or someone else's — is refused. */
  async resolveOwnedRequest(user_id: string, requestId: string) {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new GraphQLError('Invalid follow request', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const request = await FollowRequestModel.findById(requestId);
    if (!request || String(request.target_id) !== user_id) {
      throw new GraphQLError('Follow request not found', { extensions: { code: 'NOT_FOUND' } });
    }
    if (request.status !== 'PENDING') {
      throw new GraphQLError('This follow request has already been answered', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    return request;
  },

  /** The REQUESTER withdraws their own pending ask — what tapping "Requested"
   * does. Idempotent: nothing open simply means nothing to withdraw. */
  async cancelFollowRequest(user_id: string, targetUserId: string) {
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const withdrawn = await FollowRequestModel.findOneAndUpdate(
      {
        requester_id: new Types.ObjectId(user_id),
        target_id: new Types.ObjectId(targetUserId),
        status: 'PENDING',
      },
      { $set: { status: 'CANCELLED', resolved_at: new Date() } }
    ).select('_id');
    if (withdrawn) {
      // The ask no longer exists, so neither does the owner's row about it.
      // Left in place it would read as a request they had denied — an answer
      // they never gave. removeByActionRef re-reads the owner's inbox itself.
      const { notificationService } = await import(
        '@modules/engagement/notification/notification.service'
      );
      await notificationService.removeByActionRef(String(withdrawn._id));
      pokeInbox([user_id]);
    }
    return toPublic(await UserModel.findById(user_id));
  },

  /** What the Follow button must render: FOLLOWING beats REQUESTED beats NONE.
   * One definition so the profile page, the follow lists and search cannot
   * disagree about the same pair. */
  async followStatus(viewerId: string | null, targetId: string) {
    if (!viewerId || !Types.ObjectId.isValid(viewerId) || !Types.ObjectId.isValid(targetId)) {
      return 'NONE';
    }
    if (await this.isFollowing(viewerId, targetId)) return 'FOLLOWING';
    const pending = await FollowRequestModel.exists({
      requester_id: new Types.ObjectId(viewerId),
      target_id: new Types.ObjectId(targetId),
      status: 'PENDING',
    });
    return pending ? 'REQUESTED' : 'NONE';
  },

  /**
   * `followStatus` for many targets in two reads. A target absent from the map
   * is 'NONE', exactly as `followStatus` answers it (an invalid id included).
   */
  async followStatuses(viewerId: string, targetIds: readonly string[]) {
    const statuses = new Map<string, 'FOLLOWING' | 'REQUESTED'>();
    const targets = targetIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (!Types.ObjectId.isValid(viewerId) || targets.length === 0) return statuses;
    const viewer = new Types.ObjectId(viewerId);
    const [following, requested] = await Promise.all([
      UserRelationshipModel.find({ follower_id: viewer, following_id: { $in: targets } })
        .select('following_id')
        .lean(),
      FollowRequestModel.find({ requester_id: viewer, target_id: { $in: targets }, status: 'PENDING' })
        .select('target_id')
        .lean(),
    ]);
    // Following wins over a stale pending ask, as in followStatus.
    for (const row of requested as any[]) statuses.set(String(row.target_id), 'REQUESTED');
    for (const row of following as any[]) statuses.set(String(row.following_id), 'FOLLOWING');
    return statuses;
  },

  /** The id of the OPEN ask `requesterId` has against `targetId`, or null. What
   * lets a profile page answer a request from the relationship itself rather
   * than only from the notification about it. */
  async pendingFollowRequestId(requesterId: string | null, targetId: string) {
    if (!requesterId || !Types.ObjectId.isValid(requesterId) || !Types.ObjectId.isValid(targetId)) {
      return null;
    }
    const open = await FollowRequestModel.findOne({
      requester_id: new Types.ObjectId(requesterId),
      target_id: new Types.ObjectId(targetId),
      status: 'PENDING',
    })
      .select('_id')
      .lean();
    return open ? String(open._id) : null;
  },

  /** Open requests waiting on `targetId`, newest first — the owner's inbox of
   * asks, independent of whether they still have the notification. */
  async listPendingFollowRequests(targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) return [];
    const rows = await FollowRequestModel.find({
      target_id: new Types.ObjectId(targetId),
      status: 'PENDING',
    })
      .sort({ created_at: -1 })
      .lean();
    return rows.map((r: any) => ({
      id: String(r._id),
      requester_id: String(r.requester_id),
      status: String(r.status),
      created_at: new Date(r.created_at).toISOString(),
    }));
  },

  /** Target ids the viewer has an OPEN request against — the batch form of
   * followStatus, so a list of N profiles costs one query, not N. */
  async listRequestedUserIds(viewerId: string) {
    if (!Types.ObjectId.isValid(viewerId)) return [];
    const rows = await FollowRequestModel.find({
      requester_id: new Types.ObjectId(viewerId),
      status: 'PENDING',
    })
      .select('target_id')
      .lean();
    return rows.map((r: any) => String(r.target_id));
  },

  // Best-effort "started following you" notification to the followed user.
  // A failure here must never break the follow itself.
  //
  // The row is ACTIONABLE: it carries the follower as its actor, so the inbox
  // can offer Follow Back straight from it. For a PUBLIC profile this is the
  // only row it ever gets about a new follower — no follow request is ever
  // raised — so without the actor there is no way to follow back from the
  // inbox at all. Whether the button shows is decided per viewer by
  // Notification.follow_back_status, which hides it once they already follow.
  async notifyNewFollower(targetUserId: string, follower: Awaited<ReturnType<typeof toPublic>>) {
    try {
      const { notificationService } = await import(
        '@modules/engagement/notification/notification.service'
      );
      const name = follower?.full_name?.trim() || 'Someone';
      // One row per relationship: a re-follow replaces the older row about
      // this person instead of stacking a second one above it.
      if (follower?.user_id) {
        await notificationService.removeFollowRowsAbout(targetUserId, follower.user_id);
      }
      await notificationService.create({
        title: 'New follower',
        body: `${name} started following you`,
        image_url: follower?.profile_photo ?? null,
        link_url: follower?.user_id ? `/u/${follower.user_id}` : null,
        action_type: 'NEW_FOLLOWER',
        // Stored, not derived: a new-follower row references no document, so
        // this column is the ONLY record of who it is about.
        action_actor_id: follower?.user_id ?? null,
        scope: 'USER',
        target_user_ids: [targetUserId],
      });
    } catch (err) {
      logs.server.error('user.service', 'notifyNewFollower', { error: err, msg: 'notifyNewFollower failed', targetUserId });
    }
  },

  async unfollowUser(user_id: string, targetUserId: string) {
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const followerOid = new Types.ObjectId(user_id);
    const followingOid = new Types.ObjectId(targetUserId);
    const res = await UserRelationshipModel.deleteOne({
      follower_id: followerOid,
      following_id: followingOid,
    });
    if (res.deletedCount) {
      await Promise.all([
        UserModel.updateOne({ _id: followerOid }, { $inc: { 'counters.following_count': -1 } }),
        UserModel.updateOne({ _id: followingOid }, { $inc: { 'counters.followers_count': -1 } }),
      ]);
      // Follow Back is back on offer on their rows about this person.
      pokeInbox([user_id]);
    }
    const updated = await UserModel.findById(user_id);
    return toPublic(updated);
  },

  // True when `viewerId` already follows `targetId`.
  async isFollowing(viewerId: string, targetId: string) {
    if (!Types.ObjectId.isValid(viewerId) || !Types.ObjectId.isValid(targetId)) return false;
    const edge = await UserRelationshipModel.exists({
      follower_id: new Types.ObjectId(viewerId),
      following_id: new Types.ObjectId(targetId),
    });
    return !!edge;
  },

  // The ids of users `viewerId` follows (lean, for batch follow checks).
  async listFollowingUserIds(viewerId: string) {
    if (!Types.ObjectId.isValid(viewerId)) return [];
    const edges = await UserRelationshipModel.find({ follower_id: new Types.ObjectId(viewerId) })
      .select('following_id')
      .lean();
    return edges.map((e: any) => String(e.following_id));
  },

  // The ids of users who follow `targetId` (powers the Followers list, bug 9).
  async listFollowerUserIds(targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) return [];
    const edges = await UserRelationshipModel.find({ following_id: new Types.ObjectId(targetId) })
      .select('follower_id')
      .lean();
    return edges.map((e: any) => String(e.follower_id));
  },

  // Can `viewerId` see `ownerId`'s posts/stories/private details? Owner always
  // can; a block either way never can; PUBLIC profiles are open; PRIVATE
  // profiles need a follow edge.
  async canViewContent(ownerId: string, viewerId: string | null) {
    if (!Types.ObjectId.isValid(ownerId)) return false;
    if (viewerId && viewerId === ownerId) return true;
    if (await isBlockedEitherWay(viewerId, ownerId)) return false;
    const owner = await UserModel.findById(ownerId).select('metadata.profile_visibility');
    if (!owner) return false;
    const visibility = (owner as any).metadata?.profile_visibility ?? 'PUBLIC';
    if (visibility === 'PUBLIC') return true;
    return viewerId ? this.isFollowing(viewerId, ownerId) : false;
  },
};

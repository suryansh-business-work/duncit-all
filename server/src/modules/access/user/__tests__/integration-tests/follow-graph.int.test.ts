/**
 * The follow graph, against a real database.
 *
 * This is the gate on a private profile, so the rules are about consent and
 * about counters that nothing else can repair once they drift:
 *
 *  - a PRIVATE profile is ASKED, never taken. Following one opens a pending
 *    request and writes no edge, so nobody gains access as a side effect of a
 *    tap.
 *  - already following short-circuits, so a stale client cannot downgrade an
 *    accepted follow back into a pending request.
 *  - `createFollowEdge` is the ONE place an edge is born — a direct follow and
 *    an accepted request share it, which is what stops the two paths drifting
 *    on the counters or the follower notification.
 *  - the counters move exactly once. Following twice is idempotent because the
 *    unique index says so, and a second call must not increment again — a
 *    follower count that has drifted has no source of truth to be rebuilt from.
 *  - answering a request is only the target's to do, and only once.
 *
 * The email transport is stubbed for the same reason the suite next door stubs
 * it: fire-and-forget mail outlives the per-suite teardown and surfaces as a
 * spurious unhandled rejection.
 */
jest.mock('@services/email/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminCredentialsEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangeOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountDeletionOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessGrantedEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAccessRevokedEmail: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';

import { userService } from '../../user.service';
import { UserModel } from '../../user.model';
import { FollowRequestModel, UserRelationshipModel } from '../../relations';

type Visibility = 'PUBLIC' | 'PRIVATE';

let seq = 0;

/** A minimal ACTIVE account, written through the model so its defaults apply. */
async function makeUser(visibility: Visibility = 'PUBLIC') {
  seq += 1;
  const doc = await UserModel.create({
    profile: { first_name: 'Member', last_name: String(seq) },
    auth: { email: `member${seq}-${Date.now()}@duncit.com`, password_hash: 'x' },
    metadata: { status: 'ACTIVE', profile_visibility: visibility },
  });
  return String(doc._id);
}

const countersOf = async (id: string) => {
  const doc = await UserModel.findById(id).select('counters').lean<any>();
  return {
    followers: doc?.counters?.followers_count ?? 0,
    following: doc?.counters?.following_count ?? 0,
  };
};

const edgeCount = (follower: string, following: string) =>
  UserRelationshipModel.countDocuments({
    follower_id: new Types.ObjectId(follower),
    following_id: new Types.ObjectId(following),
  });

describe('following a public profile', () => {
  it('writes the edge and moves both counters', async () => {
    const [me, them] = [await makeUser(), await makeUser()];

    await userService.followUser(me, them);

    expect(await edgeCount(me, them)).toBe(1);
    expect((await countersOf(me)).following).toBe(1);
    expect((await countersOf(them)).followers).toBe(1);
  });

  it('is idempotent — a second tap writes no second edge and no second count', async () => {
    const [me, them] = [await makeUser(), await makeUser()];

    await userService.followUser(me, them);
    await userService.followUser(me, them);

    // A follower count that has drifted has nothing to be rebuilt from.
    expect(await edgeCount(me, them)).toBe(1);
    expect((await countersOf(them)).followers).toBe(1);
  });

  it('refuses to let anybody follow themselves', async () => {
    const me = await makeUser();

    await expect(userService.followUser(me, me)).rejects.toThrow('cannot follow yourself');
  });

  it('refuses an id that is not one', async () => {
    const me = await makeUser();

    await expect(userService.followUser(me, 'not-an-id')).rejects.toThrow('Invalid user');
  });

  it('refuses somebody who does not exist', async () => {
    const me = await makeUser();

    await expect(
      userService.followUser(me, new Types.ObjectId().toString())
    ).rejects.toThrow('User not found');
  });

  it('refuses an account that is not active', async () => {
    const me = await makeUser();
    const them = await makeUser();
    await UserModel.updateOne({ _id: them }, { $set: { 'metadata.status': 'BLOCKED' } });

    await expect(userService.followUser(me, them)).rejects.toThrow('User not found');
  });
});

describe('following a private profile', () => {
  it('opens a request and writes NO edge — consent is asked, not taken', async () => {
    const me = await makeUser();
    const them = await makeUser('PRIVATE');

    await userService.followUser(me, them);

    expect(await edgeCount(me, them)).toBe(0);
    const open = await FollowRequestModel.findOne({
      requester_id: new Types.ObjectId(me),
      target_id: new Types.ObjectId(them),
    }).lean<any>();
    expect(open?.status).toBe('PENDING');
  });

  it('re-asking while one is open is a no-op, not an error', async () => {
    const me = await makeUser();
    const them = await makeUser('PRIVATE');

    await userService.followUser(me, them);
    await userService.followUser(me, them);

    const open = await FollowRequestModel.countDocuments({
      requester_id: new Types.ObjectId(me),
      target_id: new Types.ObjectId(them),
      status: 'PENDING',
    });
    expect(open).toBe(1);
  });

  it('never downgrades an accepted follow back into a request', async () => {
    const me = await makeUser();
    const them = await makeUser();
    await userService.followUser(me, them);
    // The owner turns their profile private AFTER being followed.
    await UserModel.updateOne({ _id: them }, { $set: { 'metadata.profile_visibility': 'PRIVATE' } });

    await userService.followUser(me, them);

    expect(await edgeCount(me, them)).toBe(1);
    expect(
      await FollowRequestModel.countDocuments({ requester_id: new Types.ObjectId(me) })
    ).toBe(0);
  });

  it('reports the viewer state as requested while the ask is open', async () => {
    const me = await makeUser();
    const them = await makeUser('PRIVATE');
    await userService.followUser(me, them);

    const status = await userService.followStatus(me, them);

    expect(String(status)).toMatch(/REQUEST/i);
  });

  it('lists the open requests for the profile they were sent to', async () => {
    const me = await makeUser();
    const them = await makeUser('PRIVATE');
    await userService.followUser(me, them);

    const pending = await userService.listPendingFollowRequests(them);

    expect(pending).toHaveLength(1);
  });

  it('lists who the viewer has an open ask with, so their own buttons read right', async () => {
    const me = await makeUser();
    const them = await makeUser('PRIVATE');
    await userService.followUser(me, them);

    const requested = await userService.listRequestedUserIds(me);

    expect(requested.map(String)).toContain(them);
  });
});

describe('answering a follow request', () => {
  const askedBy = async () => {
    const me = await makeUser();
    const them = await makeUser('PRIVATE');
    await userService.followUser(me, them);
    const open = await FollowRequestModel.findOne({
      requester_id: new Types.ObjectId(me),
    }).lean<any>();
    return { me, them, requestId: String(open._id) };
  };

  it('accepting writes the edge through the SAME path a direct follow takes', async () => {
    const { me, them, requestId } = await askedBy();

    await userService.acceptFollowRequest(them, requestId);

    expect(await edgeCount(me, them)).toBe(1);
    expect((await countersOf(them)).followers).toBe(1);
    expect((await countersOf(me)).following).toBe(1);
  });

  it('rejecting writes no edge, and closes the ask', async () => {
    const { me, them, requestId } = await askedBy();

    await userService.rejectFollowRequest(them, requestId);

    expect(await edgeCount(me, them)).toBe(0);
    const answered = await FollowRequestModel.findById(requestId).lean<any>();
    expect(answered?.status).not.toBe('PENDING');
  });

  it('is only the TARGET who may answer it', async () => {
    const { me, requestId } = await askedBy();
    const stranger = await makeUser();

    await expect(userService.acceptFollowRequest(stranger, requestId)).rejects.toThrow();
    await expect(userService.acceptFollowRequest(me, requestId)).rejects.toThrow();
  });

  it('cannot be answered twice', async () => {
    const { them, requestId } = await askedBy();
    await userService.acceptFollowRequest(them, requestId);

    await expect(userService.acceptFollowRequest(them, requestId)).rejects.toThrow();
  });

  it('refuses a request that does not exist', async () => {
    const them = await makeUser('PRIVATE');

    await expect(
      userService.acceptFollowRequest(them, new Types.ObjectId().toString())
    ).rejects.toThrow();
  });

  it('lets the requester withdraw their own ask', async () => {
    const { me, them } = await askedBy();

    await userService.cancelFollowRequest(me, them);

    expect(
      await FollowRequestModel.countDocuments({
        requester_id: new Types.ObjectId(me),
        status: 'PENDING',
      })
    ).toBe(0);
  });
});

describe('unfollowing', () => {
  it('removes the edge and moves both counters back', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    await userService.followUser(me, them);

    await userService.unfollowUser(me, them);

    expect(await edgeCount(me, them)).toBe(0);
    expect((await countersOf(me)).following).toBe(0);
    expect((await countersOf(them)).followers).toBe(0);
  });

  it('unfollowing somebody you never followed changes nothing', async () => {
    const [me, them] = [await makeUser(), await makeUser()];

    await userService.unfollowUser(me, them);

    expect((await countersOf(them)).followers).toBe(0);
  });
});

describe('followStatus', () => {
  it('is NONE between two strangers', async () => {
    const [me, them] = [await makeUser(), await makeUser()];

    expect(String(await userService.followStatus(me, them))).toMatch(/NONE|NOT/i);
  });

  it('is following once the edge exists', async () => {
    const [me, them] = [await makeUser(), await makeUser()];
    await userService.followUser(me, them);

    expect(String(await userService.followStatus(me, them))).toMatch(/FOLLOWING/i);
  });

  it('answers for a signed-out reader without throwing', async () => {
    const them = await makeUser();

    await expect(userService.followStatus(null, them)).resolves.toBeDefined();
  });
});

describe('profile visibility', () => {
  it('is what decides whether a follow is taken or asked', async () => {
    const me = await makeUser();
    const them = await makeUser();

    await userService.updateMyProfileVisibility(them, 'PRIVATE');
    await userService.followUser(me, them);
    expect(await edgeCount(me, them)).toBe(0);

    await userService.updateMyProfileVisibility(them, 'PUBLIC');
    const other = await makeUser();
    await userService.followUser(other, them);
    expect(await edgeCount(other, them)).toBe(1);
  });
});

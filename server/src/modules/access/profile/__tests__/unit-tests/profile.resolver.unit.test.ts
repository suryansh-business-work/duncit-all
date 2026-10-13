const userService = {
  me: jest.fn(),
  listSavedPods: jest.fn(),
  getByHandle: jest.fn(),
  followStatus: jest.fn(),
  isFollowing: jest.fn(),
  pendingFollowRequestId: jest.fn(),
  usernameAvailability: jest.fn(),
  listFollowerUserIds: jest.fn(),
  listFollowingUserIds: jest.fn(),
  listRequestedUserIds: jest.fn(),
  listPendingFollowRequests: jest.fn(),
  listPublicCardSources: jest.fn(),
  updateMyProfile: jest.fn(),
  setMyUsername: jest.fn(),
  updateMyProfileVisibility: jest.fn(),
  setMySelectedLocation: jest.fn(),
  setMyLocale: jest.fn(),
  requestEmailVerificationOtp: jest.fn(),
  verifyEmailVerificationOtp: jest.fn(),
  updateMyPetProfile: jest.fn(),
  updateMyInterests: jest.fn(),
  toggleSavedPod: jest.fn(),
  followPod: jest.fn(),
  unfollowPod: jest.fn(),
  followClub: jest.fn(),
  unfollowClub: jest.fn(),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  acceptFollowRequest: jest.fn(),
  rejectFollowRequest: jest.fn(),
  cancelFollowRequest: jest.fn(),
};
const hasBlocked = jest.fn();
const assertEligibleDob = jest.fn();

jest.mock('@modules/access/user/user.service', () => ({ userService }));
jest.mock('@modules/access/block/userBlock.model', () => ({ hasBlocked: (...a: unknown[]) => hasBlocked(...a) }));
jest.mock('@utils/age', () => ({ assertEligibleDob: (...a: unknown[]) => assertEligibleDob(...a) }));
jest.mock('@utils/validate', () => ({ validate: async (_schema: unknown, data: unknown) => data }));

import { mapPublicProfiles, profileResolvers, publicProfilesFromDocs } from '../../profile.resolver';
import { USER_SCHEMA_FLAGS } from '@modules/access/user/user.featureFlags';
import { makeContext } from '@test/harness';

const ctx = (id: string | null = 'viewer') => makeContext(id ? { id } : null);
const Q = profileResolvers.Query as Record<string, (...a: any[]) => Promise<any>>;
const M = profileResolvers.Mutation as Record<string, (...a: any[]) => Promise<any>>;

beforeEach(() => {
  jest.resetAllMocks();
  userService.listFollowingUserIds.mockResolvedValue([]);
  userService.listRequestedUserIds.mockResolvedValue([]);
  userService.listFollowerUserIds.mockResolvedValue([]);
  userService.listPendingFollowRequests.mockResolvedValue([]);
});

describe('profile mutations require authentication and delegate for the caller', () => {
  const cases: [string, unknown, string, unknown[]][] = [
    ['updateMyProfile', { input: { first_name: 'A' } }, 'updateMyProfile', ['viewer', { first_name: 'A' }]],
    ['setMyUsername', { username: 'asha' }, 'setMyUsername', ['viewer', 'asha']],
    ['updateMyProfileVisibility', { visibility: 'PRIVATE' }, 'updateMyProfileVisibility', ['viewer', 'PRIVATE']],
    ['setMySelectedLocation', { location_id: 'l1', zone_name: 'z' }, 'setMySelectedLocation', ['viewer', 'l1', 'z']],
    ['setMyLocale', { locale: 'hi' }, 'setMyLocale', ['viewer', 'hi']],
    ['requestEmailVerificationOtp', {}, 'requestEmailVerificationOtp', ['viewer']],
    ['verifyEmailVerificationOtp', { otp: '123456' }, 'verifyEmailVerificationOtp', ['viewer', '123456']],
    ['updateMyPetProfile', { input: { name: 'Rex' } }, 'updateMyPetProfile', ['viewer', { name: 'Rex' }]],
    ['updateMyInterests', { category_ids: ['c1'] }, 'updateMyInterests', ['viewer', ['c1']]],
    ['toggleSavedPod', { pod_doc_id: 'p1' }, 'toggleSavedPod', ['viewer', 'p1']],
    ['followPod', { pod_id: 'p1' }, 'followPod', ['viewer', 'p1']],
    ['unfollowPod', { pod_id: 'p1' }, 'unfollowPod', ['viewer', 'p1']],
    ['followClub', { club_id: 'c1' }, 'followClub', ['viewer', 'c1']],
    ['unfollowClub', { club_id: 'c1' }, 'unfollowClub', ['viewer', 'c1']],
    ['followUser', { user_id: 'u2' }, 'followUser', ['viewer', 'u2']],
    ['unfollowUser', { user_id: 'u2' }, 'unfollowUser', ['viewer', 'u2']],
    ['acceptFollowRequest', { request_id: 'r1' }, 'acceptFollowRequest', ['viewer', 'r1']],
    ['rejectFollowRequest', { request_id: 'r1' }, 'rejectFollowRequest', ['viewer', 'r1']],
    ['cancelFollowRequest', { user_id: 'u2' }, 'cancelFollowRequest', ['viewer', 'u2']],
  ];

  it.each(cases)('%s refuses an anonymous caller without touching the service', async (name, args, method) => {
    await expect(M[name]({}, args, ctx(null))).rejects.toMatchObject({
      message: 'Authentication required',
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect((userService as Record<string, jest.Mock>)[method]).not.toHaveBeenCalled();
  });

  it.each(cases)('%s delegates with the caller id', async (name, args, method, expected) => {
    const svc = (userService as Record<string, jest.Mock>)[method];
    svc.mockResolvedValue({ ok: name });
    userService.me.mockResolvedValue({ dob: null });
    await expect(M[name]({}, args, ctx())).resolves.toEqual({ ok: name });
    expect(svc).toHaveBeenCalledWith(...expected);
  });

  it('setMySelectedLocation defaults missing arguments to null', async () => {
    userService.setMySelectedLocation.mockResolvedValue(true);
    await M.setMySelectedLocation({}, {}, ctx());
    expect(userService.setMySelectedLocation).toHaveBeenCalledWith('viewer', null, null);
  });

  it('updateMyProfile checks the age gate against the stored dob only when a dob is sent', async () => {
    userService.me.mockResolvedValue({ dob: '1990-01-01' });
    userService.updateMyProfile.mockResolvedValue({});
    await M.updateMyProfile({}, { input: { dob: '1995-05-05' } }, ctx());
    expect(assertEligibleDob).toHaveBeenLastCalledWith('1995-05-05', '1990-01-01');
    userService.me.mockClear();
    await M.updateMyProfile({}, { input: { first_name: 'Only' } }, ctx());
    expect(userService.me).not.toHaveBeenCalled();
    expect(assertEligibleDob).toHaveBeenLastCalledWith(undefined, undefined);
  });

  it('updateMyProfile stops when the date of birth is ineligible', async () => {
    userService.me.mockResolvedValue({ dob: null });
    assertEligibleDob.mockRejectedValueOnce(new Error('too young'));
    await expect(M.updateMyProfile({}, { input: { dob: '2015-01-01' } }, ctx())).rejects.toThrow('too young');
    expect(userService.updateMyProfile).not.toHaveBeenCalled();
  });
});

describe('profile queries', () => {
  it('me is null for an anonymous caller and the user otherwise', async () => {
    expect(await Q.me({}, {}, ctx(null))).toBeNull();
    userService.me.mockResolvedValue({ id: 'viewer' });
    expect(await Q.me({}, {}, ctx())).toEqual({ id: 'viewer' });
  });

  it('mySavedPods requires auth and forwards the filters', async () => {
    await expect(Q.mySavedPods({}, {}, ctx(null))).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    userService.listSavedPods.mockResolvedValue([]);
    await Q.mySavedPods({}, { search: 'yoga', category_id: 'c1', sort: 'NEW' }, ctx());
    expect(userService.listSavedPods).toHaveBeenCalledWith('viewer', { search: 'yoga', categoryId: 'c1', sort: 'NEW' });
  });

  it('usernameAvailability passes the caller or null', async () => {
    userService.usernameAvailability.mockResolvedValue({ available: true });
    await Q.usernameAvailability({}, { username: 'asha' }, ctx(null));
    expect(userService.usernameAvailability).toHaveBeenLastCalledWith('asha', null);
    await Q.usernameAvailability({}, { username: 'asha' }, ctx());
    expect(userService.usernameAvailability).toHaveBeenLastCalledWith('asha', 'viewer');
  });

  it('PublicProfile.blocked_by_viewer prefers the value already resolved, else looks it up', async () => {
    const resolver = (profileResolvers.PublicProfile as { blocked_by_viewer: (...a: any[]) => unknown }).blocked_by_viewer;
    expect(resolver({ user_id: 'u', blocked_by_viewer: false }, {}, ctx())).toBe(false);
    hasBlocked.mockReturnValue('lookup');
    expect(resolver({ user_id: 'u' }, {}, ctx())).toBe('lookup');
    expect(hasBlocked).toHaveBeenLastCalledWith('viewer', 'u');
    resolver({ user_id: 'u' }, {}, ctx(null));
    expect(hasBlocked).toHaveBeenLastCalledWith(null, 'u');
  });
});

describe('publicUserProfile privacy', () => {
  const user = (over: Record<string, unknown> = {}) => ({
    user_id: 'u1',
    username: 'asha',
    full_name: 'Asha Rao',
    first_name: 'Asha',
    last_name: 'Rao',
    bio: 'hello',
    city: 'Pune',
    zone: 'Baner',
    followers_count: 3,
    following_count: 4,
    roles: ['HOST'],
    ...over,
  });

  beforeEach(() => {
    userService.followStatus.mockResolvedValue('NONE');
    userService.isFollowing.mockResolvedValue(false);
    userService.pendingFollowRequestId.mockResolvedValue(null);
    hasBlocked.mockResolvedValue(false);
  });

  it('returns null for an unknown handle, including when the lookup throws', async () => {
    userService.getByHandle.mockResolvedValue(null);
    expect(await Q.publicUserProfile({}, { user_id: 'nobody' }, ctx())).toBeNull();
    userService.getByHandle.mockRejectedValue(new Error('bad id'));
    expect(await Q.publicUserProfile({}, { user_id: 'nobody' }, ctx())).toBeNull();
  });

  it('shows a public profile in full, with the host flag and the viewer relation', async () => {
    userService.getByHandle.mockResolvedValue(user());
    userService.isFollowing.mockResolvedValue(true);
    userService.pendingFollowRequestId.mockResolvedValue('req-1');
    const p = await Q.publicUserProfile({}, { user_id: 'asha' }, ctx());
    expect(p).toMatchObject({
      username: 'asha',
      bio: 'hello',
      can_view_content: true,
      is_private: false,
      is_host: true,
      follows_viewer: true,
      inbound_request_id: 'req-1',
      follow_status: 'NONE',
      blocked_by_viewer: false,
    });
  });

  it('hides bio, city and zone of a private profile from a stranger but shows them to followers and the owner', async () => {
    userService.getByHandle.mockResolvedValue(user({ profile_visibility: 'PRIVATE' }));
    const stranger = await Q.publicUserProfile({}, { user_id: 'asha' }, ctx());
    expect(stranger).toMatchObject({ is_private: true, bio: null, city: null, zone: null, can_view_content: false, full_name: 'Asha Rao' });
    userService.followStatus.mockResolvedValue('FOLLOWING');
    expect(await Q.publicUserProfile({}, { user_id: 'asha' }, ctx())).toMatchObject({
      bio: 'hello',
      follow_status: 'FOLLOWING',
      can_view_content: true,
    });
    userService.followStatus.mockResolvedValue('NONE');
    expect(await Q.publicUserProfile({}, { user_id: 'asha' }, ctx('u1'))).toMatchObject({ bio: 'hello', can_view_content: true });
  });

  it('a pending request changes the button but grants no access', async () => {
    userService.getByHandle.mockResolvedValue(user({ profile_visibility: 'PRIVATE' }));
    userService.followStatus.mockResolvedValue('REQUESTED');
    expect(await Q.publicUserProfile({}, { user_id: 'asha' }, ctx())).toMatchObject({
      follow_status: 'REQUESTED',
      bio: null,
      can_view_content: false,
    });
  });

  it('reads as not found when the profile owner has blocked the viewer', async () => {
    userService.getByHandle.mockResolvedValue(user());
    hasBlocked.mockImplementation(async (blocker: string) => blocker === 'u1');
    expect(await Q.publicUserProfile({}, { user_id: 'asha' }, ctx())).toBeNull();
  });

  it('strips content when the viewer has blocked the profile, and flags it', async () => {
    userService.getByHandle.mockResolvedValue(user());
    userService.followStatus.mockResolvedValue('FOLLOWING');
    hasBlocked.mockImplementation(async (blocker: string | null) => blocker === 'viewer');
    expect(await Q.publicUserProfile({}, { user_id: 'asha' }, ctx())).toMatchObject({
      blocked_by_viewer: true,
      bio: null,
      can_view_content: false,
    });
  });

  it('serves an anonymous viewer without asking for their relations', async () => {
    userService.getByHandle.mockResolvedValue(user());
    hasBlocked.mockResolvedValue(false);
    const p = await Q.publicUserProfile({}, { user_id: 'asha' }, ctx(null));
    expect(p).toMatchObject({ follows_viewer: false, inbound_request_id: null });
    expect(userService.isFollowing).not.toHaveBeenCalled();
    expect(userService.pendingFollowRequestId).not.toHaveBeenCalled();
  });

  it('derives a stable handle and name for accounts that predate stored usernames', async () => {
    userService.getByHandle.mockResolvedValue(
      user({ username: undefined, full_name: undefined, first_name: 'Ásha!', last_name: undefined, user_id: 'abcdef1234', roles: undefined })
    );
    const p = await Q.publicUserProfile({}, { user_id: 'x' }, ctx());
    expect(p).toMatchObject({ username: 'sha1234', full_name: 'Ásha!', is_host: false });
    userService.getByHandle.mockResolvedValue(
      user({ username: undefined, first_name: undefined, last_name: undefined, full_name: undefined, user_id: undefined, bio: undefined, followers_count: undefined })
    );
    const q = await Q.publicUserProfile({}, { user_id: 'x' }, ctx());
    expect(q).toMatchObject({ username: 'user', full_name: '', bio: null, followers_count: 0 });
    userService.getByHandle.mockResolvedValue(user({ username: undefined, first_name: undefined, full_name: 'Zed Q', user_id: '99' }));
    expect(await Q.publicUserProfile({}, { user_id: 'x' }, ctx())).toMatchObject({ username: 'zedq99' });
  });
});

describe('follow lists and public cards', () => {
  const doc = (id: string, over: Record<string, any> = {}) => ({
    _id: id,
    profile: { username: `h${id}`, first_name: `F${id}`, last_name: 'L', bio: 'b', city: 'c', zone: 'z', profile_photo: 'p.jpg' },
    counters: { followers_count: 2, following_count: 1 },
    metadata: { profile_visibility: 'PUBLIC', role_keys: ['USER'] },
    ...over,
  });

  it('maps ids to cards in request order, drops missing users, and tags the viewer edges', async () => {
    userService.listPublicCardSources.mockResolvedValue({ docs: [doc('a'), doc('b')], rolesByUser: new Map([['b', ['HOST']]]) });
    userService.listFollowingUserIds.mockResolvedValue(['b']);
    userService.listRequestedUserIds.mockResolvedValue(['a']);
    userService.listFollowerUserIds.mockResolvedValue(['a']);
    userService.listPendingFollowRequests.mockResolvedValue([{ requester_id: 'a', id: 'req-a' }]);
    const out = await mapPublicProfiles(['b', '', 'ghost', 'a'], 'viewer');
    expect(out.map((p: any) => p.user_id)).toEqual(['b', 'a']);
    expect(out[0]).toMatchObject({ follow_status: 'FOLLOWING', is_host: true, follows_viewer: false });
    expect(out[1]).toMatchObject({ follow_status: 'REQUESTED', follows_viewer: true, inbound_request_id: 'req-a', is_host: false });
    expect(userService.listPublicCardSources).toHaveBeenCalledWith(['b', 'ghost', 'a']);
  });

  it('returns nothing without a lookup for empty input', async () => {
    expect(await mapPublicProfiles(['', ''], 'viewer')).toEqual([]);
    expect(await publicProfilesFromDocs([], 'viewer')).toEqual([]);
    expect(userService.listPublicCardSources).not.toHaveBeenCalled();
  });

  it('serves an anonymous viewer with no relation lookups', async () => {
    userService.listPublicCardSources.mockResolvedValue({ docs: [doc('a')], rolesByUser: new Map() });
    const out = await mapPublicProfiles(['a'], null);
    expect(out[0]).toMatchObject({ follow_status: 'NONE', follows_viewer: false });
    expect(userService.listFollowingUserIds).not.toHaveBeenCalled();
  });

  it('keeps a private profile from anonymous viewers', async () => {
    const [p] = await publicProfilesFromDocs([doc('a', { metadata: { profile_visibility: 'PRIVATE' } })], null);
    expect(p).toMatchObject({ is_private: true, bio: null, can_view_content: false });
  });

  it('reads legacy flat fields while dual-write is on and ignores them when off', async () => {
    const legacy = { _id: 'old', first_name: 'Old', last_name: 'Name', city: 'Goa', roles: ['HOST'] };
    const [withLegacy] = await publicProfilesFromDocs([legacy], null);
    expect(withLegacy).toMatchObject({ first_name: 'Old', city: 'Goa', is_host: true, followers_count: 0, is_private: false });
    const flags = USER_SCHEMA_FLAGS as { dualWrite: boolean };
    const before = flags.dualWrite;
    flags.dualWrite = false;
    try {
      const [without] = await publicProfilesFromDocs([legacy], null);
      expect(without).toMatchObject({ first_name: null, city: null, is_host: false });
    } finally {
      flags.dualWrite = before;
    }
  });

  it('followersOf and followingOf map the ids the service lists', async () => {
    userService.listFollowerUserIds.mockResolvedValue(['a']);
    userService.listFollowingUserIds.mockResolvedValue(['b']);
    userService.listPublicCardSources.mockImplementation(async (ids: string[]) => ({
      docs: ids.map((id) => doc(id)),
      rolesByUser: new Map(),
    }));
    expect((await Q.followersOf({}, { user_id: 'u' }, ctx(null))).map((p: any) => p.user_id)).toEqual(['a']);
    expect((await Q.followingOf({}, { user_id: 'u' }, ctx(null))).map((p: any) => p.user_id)).toEqual(['b']);
    userService.listPublicCardSources.mockResolvedValue({ docs: [doc('a')], rolesByUser: new Map() });
    expect((await Q.publicUsersByIds({}, { user_ids: ['a'] }, ctx())).length).toBe(1);
    expect(await Q.publicUsersByIds({}, { user_ids: undefined }, ctx(null))).toEqual([]);
    userService.getByHandle.mockResolvedValue({ user_id: 'zz90', first_name: '!!!', full_name: '!!!', following_count: undefined });
    userService.followStatus.mockResolvedValue('NONE');
    hasBlocked.mockResolvedValue(false);
    expect(await Q.publicUserProfile({}, { user_id: 'zz90' }, ctx())).toMatchObject({ username: 'userzz90', following_count: 0 });
  });

  it('myFollowRequests is empty for anonymous callers and drops requesters whose account is gone', async () => {
    expect(await Q.myFollowRequests({}, {}, ctx(null))).toEqual([]);
    userService.listPendingFollowRequests.mockResolvedValue([
      { id: 'r1', requester_id: 'a', status: 'PENDING', created_at: 'now' },
      { id: 'r2', requester_id: 'gone', status: 'PENDING', created_at: 'now' },
    ]);
    userService.listPublicCardSources.mockResolvedValue({ docs: [doc('a')], rolesByUser: new Map() });
    const out = await Q.myFollowRequests({}, {}, ctx());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'r1', status: 'PENDING', requester: { user_id: 'a' } });
  });
});

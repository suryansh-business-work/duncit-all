import { describe, expect, it } from 'vitest';
import {
  FOLLOW_LABEL_KEY,
  canFollowBack,
  followActionFor,
  followBackLabelKey,
  followRequestRowState,
  followStatusFrom,
  nextFollowStatus,
  readFollowStatus,
  type FollowStatus,
} from '../src/follow-status';

const ALL_STATUSES: readonly FollowStatus[] = ['NONE', 'REQUESTED', 'FOLLOWING'];

type Profile = Parameters<typeof readFollowStatus>[0];
type RequestRow = Parameters<typeof followRequestRowState>[0];

/** An open FOLLOW_REQUEST notification row, with only the fields under test overridden. */
const requestRow = (over: Partial<RequestRow> = {}): RequestRow => ({
  actionType: 'FOLLOW_REQUEST',
  requestId: 'req-1',
  status: 'PENDING',
  followBackStatus: 'NONE',
  ...over,
});

describe('followActionFor', () => {
  it('follows from a clean slate', () => {
    expect(followActionFor('NONE')).toBe('FOLLOW');
  });

  it('unfollows an existing follow edge', () => {
    expect(followActionFor('FOLLOWING')).toBe('UNFOLLOW');
  });

  // There is no edge to remove while a request is pending: unfollow would be a
  // silent no-op while the button appeared to change, so the tap withdraws.
  it('withdraws a pending request rather than unfollowing', () => {
    expect(followActionFor('REQUESTED')).toBe('CANCEL_REQUEST');
  });
});

describe('nextFollowStatus', () => {
  // The original bug in UI form: a private profile flipped straight to
  // "Following", telling the user something the server had not done.
  it('lands on REQUESTED when following a private profile', () => {
    expect(nextFollowStatus('NONE', true)).toBe('REQUESTED');
  });

  it('lands on FOLLOWING when following a public profile', () => {
    expect(nextFollowStatus('NONE', false)).toBe('FOLLOWING');
  });

  it('returns to NONE after unfollowing, whatever the privacy', () => {
    expect(nextFollowStatus('FOLLOWING', true)).toBe('NONE');
    expect(nextFollowStatus('FOLLOWING', false)).toBe('NONE');
  });

  it('returns to NONE after withdrawing a request, whatever the privacy', () => {
    expect(nextFollowStatus('REQUESTED', true)).toBe('NONE');
    expect(nextFollowStatus('REQUESTED', false)).toBe('NONE');
  });

  // Tap, then tap again: the optimistic update that follows and the one that
  // undoes it have to agree, or the button drifts from what the server holds.
  // The first tap must actually move the button (a machine stuck on NONE
  // would "round-trip" trivially), and where it lands depends on privacy.
  it('round-trips back to NONE after a second tap on either kind of profile', () => {
    const afterPrivateTap = nextFollowStatus('NONE', true);
    const afterPublicTap = nextFollowStatus('NONE', false);
    expect(afterPrivateTap).toBe('REQUESTED');
    expect(afterPublicTap).toBe('FOLLOWING');
    expect(nextFollowStatus(afterPrivateTap, true)).toBe('NONE');
    expect(nextFollowStatus(afterPublicTap, false)).toBe('NONE');
  });
});

describe('readFollowStatus', () => {
  it('prefers the server follow_status when it carries a known value', () => {
    expect(readFollowStatus({ follow_status: 'FOLLOWING', is_following: false })).toBe('FOLLOWING');
    expect(readFollowStatus({ follow_status: 'REQUESTED', is_following: true })).toBe('REQUESTED');
    expect(readFollowStatus({ follow_status: 'NONE', is_following: true })).toBe('NONE');
  });

  // A not-yet-deployed server answers only the old boolean: that still has to
  // render a correct two-state button instead of an empty one.
  it('falls back to the legacy is_following boolean when follow_status is absent', () => {
    expect(readFollowStatus({ is_following: true })).toBe('FOLLOWING');
    expect(readFollowStatus({ is_following: false })).toBe('NONE');
    expect(readFollowStatus({ follow_status: null, is_following: true })).toBe('FOLLOWING');
  });

  it('ignores an unrecognised follow_status and trusts the boolean instead', () => {
    expect(readFollowStatus({ follow_status: 'BLOCKED', is_following: true })).toBe('FOLLOWING');
    expect(readFollowStatus({ follow_status: 'following', is_following: false })).toBe('NONE');
  });

  it('answers NONE when neither field is present', () => {
    expect(readFollowStatus({})).toBe('NONE');
    expect(readFollowStatus({ follow_status: null, is_following: null })).toBe('NONE');
  });

  it('survives a missing profile payload', () => {
    expect(readFollowStatus(null as unknown as Profile)).toBe('NONE');
    expect(readFollowStatus(undefined as unknown as Profile)).toBe('NONE');
  });
});

describe('followStatusFrom', () => {
  const following: ReadonlySet<string> = new Set(['u-followed']);
  const requested: ReadonlySet<string> = new Set(['u-requested']);

  it("reads FOLLOWING for an id in the viewer's following list", () => {
    expect(followStatusFrom(following, requested, 'u-followed')).toBe('FOLLOWING');
  });

  it("reads REQUESTED for an id in the viewer's requested list", () => {
    expect(followStatusFrom(following, requested, 'u-requested')).toBe('REQUESTED');
  });

  it('reads NONE for an id in neither list', () => {
    expect(followStatusFrom(following, requested, 'u-stranger')).toBe('NONE');
    expect(followStatusFrom(new Set(), new Set(), 'u-stranger')).toBe('NONE');
  });

  // The same id can sit in both lists mid-refresh (the request was accepted but
  // the requested list has not been pruned yet); following wins, as everywhere.
  it('lets FOLLOWING win when an id is in both lists', () => {
    expect(followStatusFrom(new Set(['u1']), new Set(['u1']), 'u1')).toBe('FOLLOWING');
  });
});

describe('FOLLOW_LABEL_KEY', () => {
  // Literal keys: the shipped-key gate greps for them, so renaming one here
  // without the bundle is a build failure rather than a silently blank button.
  it('maps every follow status to the exact key the shared bundle ships', () => {
    expect(FOLLOW_LABEL_KEY).toEqual({
      NONE: 'mweb.follow.follow',
      REQUESTED: 'mweb.follow.requested',
      FOLLOWING: 'mweb.follow.following',
    });
  });

  it('reads a distinct label per state, so the button never shows one word for two states', () => {
    const keys = ALL_STATUSES.map((status) => FOLLOW_LABEL_KEY[status]);
    expect(new Set(keys).size).toBe(ALL_STATUSES.length);
  });
});

describe('followRequestRowState', () => {
  it('hides a row that is not a follow request', () => {
    expect(followRequestRowState(requestRow({ actionType: 'LIKE' }))).toBe('HIDDEN');
    expect(followRequestRowState(requestRow({ actionType: null }))).toBe('HIDDEN');
    expect(followRequestRowState({})).toBe('HIDDEN');
  });

  it('hides a follow request that carries no request to act on', () => {
    expect(followRequestRowState(requestRow({ requestId: null }))).toBe('HIDDEN');
    expect(followRequestRowState(requestRow({ requestId: '' }))).toBe('HIDDEN');
    expect(followRequestRowState(requestRow({ requestId: undefined }))).toBe('HIDDEN');
  });

  it('offers Accept / Deny while the request is pending', () => {
    expect(followRequestRowState(requestRow({ status: 'PENDING' }))).toBe('ANSWER');
  });

  // The request only stops being answerable once the server says so; a row
  // whose status has not loaded yet must not flash a settled state.
  it('treats a row whose status has not loaded yet as still open', () => {
    expect(followRequestRowState(requestRow({ status: null }))).toBe('ANSWER');
    expect(followRequestRowState(requestRow({ status: undefined }))).toBe('ANSWER');
    expect(followRequestRowState(requestRow({ status: '' }))).toBe('ANSWER');
  });

  it('answers before it settles: a pending row ignores the follow-back state', () => {
    expect(followRequestRowState(requestRow({ status: 'PENDING', followBackStatus: 'FOLLOWING' }))).toBe(
      'ANSWER',
    );
  });

  it('settles a denied or cancelled request with nothing left to do', () => {
    expect(followRequestRowState(requestRow({ status: 'DENIED' }))).toBe('SETTLED');
    expect(followRequestRowState(requestRow({ status: 'CANCELLED' }))).toBe('SETTLED');
  });

  it('offers Follow Back once accepted when the viewer does not follow them yet', () => {
    expect(followRequestRowState(requestRow({ status: 'ACCEPTED', followBackStatus: 'NONE' }))).toBe(
      'FOLLOW_BACK',
    );
    expect(followRequestRowState(requestRow({ status: 'ACCEPTED', followBackStatus: null }))).toBe(
      'FOLLOW_BACK',
    );
    expect(followRequestRowState(requestRow({ status: 'ACCEPTED', followBackStatus: undefined }))).toBe(
      'FOLLOW_BACK',
    );
  });

  // REQUESTED still renders the button, reading "Requested", so the viewer can
  // see their own ask is pending rather than wondering where it went.
  it("keeps the Follow Back row while the viewer's own ask is pending", () => {
    expect(followRequestRowState(requestRow({ status: 'ACCEPTED', followBackStatus: 'REQUESTED' }))).toBe(
      'FOLLOW_BACK',
    );
  });

  // This is precisely when Follow Back must be hidden rather than offered.
  it('settles an accepted request once the viewer already follows them back', () => {
    expect(followRequestRowState(requestRow({ status: 'ACCEPTED', followBackStatus: 'FOLLOWING' }))).toBe(
      'SETTLED',
    );
  });
});

describe('followBackLabelKey', () => {
  it("reads Requested while the viewer's own ask is pending", () => {
    expect(followBackLabelKey('REQUESTED')).toBe('mweb.follow.requested');
  });

  it('reads Follow Back when there is nothing pending', () => {
    expect(followBackLabelKey('NONE')).toBe('mweb.follow.followBack');
    expect(followBackLabelKey(null)).toBe('mweb.follow.followBack');
    expect(followBackLabelKey(undefined)).toBe('mweb.follow.followBack');
    expect(followBackLabelKey()).toBe('mweb.follow.followBack');
  });

  // A pending ask reads the same word on the profile button and on the
  // notification row — one key, so the bundle cannot say two things.
  it('shares the pending label with the profile Follow button', () => {
    expect(followBackLabelKey('REQUESTED')).toBe(FOLLOW_LABEL_KEY.REQUESTED);
  });
});

describe('canFollowBack', () => {
  it('accepts a tap when the viewer has not asked yet', () => {
    expect(canFollowBack('NONE')).toBe(true);
    expect(canFollowBack(null)).toBe(true);
    expect(canFollowBack(undefined)).toBe(true);
    expect(canFollowBack()).toBe(true);
  });

  // A pending ask cannot be re-sent; the button reads "Requested" and stops.
  it("rejects a tap while the viewer's own ask is pending", () => {
    expect(canFollowBack('REQUESTED')).toBe(false);
  });

  it('rejects a tap when the viewer already follows them', () => {
    expect(canFollowBack('FOLLOWING')).toBe(false);
  });

  // The row decision and the button gate must agree: a row the decision has
  // SETTLED can never carry a tappable Follow Back.
  it('is never tappable on an accepted row the decision has already settled', () => {
    const settled = ALL_STATUSES.filter(
      (followBackStatus) =>
        followRequestRowState(requestRow({ status: 'ACCEPTED', followBackStatus })) === 'SETTLED',
    );
    expect(settled).toEqual(['FOLLOWING']);
    for (const followBackStatus of settled) {
      expect(canFollowBack(followBackStatus)).toBe(false);
    }
  });
});

/**
 * The completeness rule every Auto Pod path shares: a host and a club always,
 * a venue only for a physical offer. Written once here and once as a Mongo
 * filter, so both are checked against the same cases.
 */
import {
  ACTIVE_FILTER,
  AUTO_POD_COMPLETE_FILTER,
  isAutoPodComplete,
  pendingBaseFilter,
  PHYSICAL_FILTER,
} from '../../autoPod.common';

const claim = {};

describe('isAutoPodComplete', () => {
  it('needs all three enrolments on a physical offer', () => {
    expect(isAutoPodComplete({ pod_mode: 'PHYSICAL', venue_claim: claim, host_claim: claim, club_claim: claim })).toBe(true);
    expect(isAutoPodComplete({ pod_mode: 'PHYSICAL', venue_claim: null, host_claim: claim, club_claim: claim })).toBe(false);
    expect(isAutoPodComplete({ pod_mode: 'PHYSICAL', venue_claim: claim, host_claim: null, club_claim: claim })).toBe(false);
    expect(isAutoPodComplete({ pod_mode: 'PHYSICAL', venue_claim: claim, host_claim: claim, club_claim: null })).toBe(false);
  });

  it('reads an offer written before pod_mode existed as physical', () => {
    expect(isAutoPodComplete({ venue_claim: null, host_claim: claim, club_claim: claim })).toBe(false);
    expect(isAutoPodComplete({ pod_mode: null, venue_claim: claim, host_claim: claim, club_claim: claim })).toBe(true);
  });

  it('needs only a host and a club on a virtual offer', () => {
    expect(isAutoPodComplete({ pod_mode: 'VIRTUAL', venue_claim: null, host_claim: claim, club_claim: claim })).toBe(true);
    expect(isAutoPodComplete({ pod_mode: 'VIRTUAL', venue_claim: null, host_claim: null, club_claim: claim })).toBe(false);
    expect(isAutoPodComplete({ pod_mode: 'VIRTUAL', venue_claim: null, host_claim: claim, club_claim: null })).toBe(false);
  });
});

describe('the Mongo filters', () => {
  it('spell the same rule, with "physical" as not-VIRTUAL so legacy rows match', () => {
    expect(AUTO_POD_COMPLETE_FILTER).toEqual({
      host_claim: { $ne: null },
      club_claim: { $ne: null },
      $or: [{ pod_mode: 'VIRTUAL' }, { venue_claim: { $ne: null } }],
    });
    expect(PHYSICAL_FILTER).toEqual({ pod_mode: { $ne: 'VIRTUAL' } });
  });
});

describe('pendingBaseFilter', () => {
  // The admin table asks "which role is this offer still waiting on"; the
  // venue clause is also physical, since a virtual offer never waits on one.
  const PRE_LIVE = { stage: { $in: ['OPEN', 'CLAIMING'] } };

  it('is null when nothing (or nothing real) was asked for', () => {
    expect(pendingBaseFilter([])).toBeNull();
    expect(pendingBaseFilter(['SOMETHING_ELSE', ''])).toBeNull();
  });

  it('builds one clause per role, the venue one physical-only', () => {
    expect(pendingBaseFilter(['VENUE'])).toEqual({ ...PRE_LIVE, ...PHYSICAL_FILTER, venue_claim: null });
    expect(pendingBaseFilter(['HOST'])).toEqual({ ...PRE_LIVE, host_claim: null });
    expect(pendingBaseFilter(['CLUB'])).toEqual({ ...PRE_LIVE, club_claim: null });
  });

  it('ORs several roles together, dropping what is not a role', () => {
    expect(pendingBaseFilter(['HOST', 'CLUB', 'nope'])).toEqual({
      $or: [
        { ...PRE_LIVE, host_claim: null },
        { ...PRE_LIVE, club_claim: null },
      ],
    });
  });
});

describe('ACTIVE_FILTER', () => {
  it('reads a row without the flag as active, so nothing written before it existed disappears', () => {
    expect(ACTIVE_FILTER).toEqual({ is_active: { $ne: false } });
  });
});

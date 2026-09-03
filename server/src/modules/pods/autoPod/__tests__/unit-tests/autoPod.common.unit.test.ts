/**
 * The completeness rule every Auto Pod path shares: a host and a club always,
 * a venue only for a physical offer. Written once here and once as a Mongo
 * filter, so both are checked against the same cases.
 */
import {
  ACTIVE_FILTER,
  AUTO_POD_COMPLETE_FILTER,
  autoPodNextRole,
  CLUB_TURN_FILTER,
  HOST_TURN_FILTER,
  isAutoPodComplete,
  pendingBaseFilter,
  PHYSICAL_FILTER,
  venueWindowOpen,
  venueWindowPassed,
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

// Enrolment runs venue → host → club admin; the queues and the notifier both
// read whose turn it is from here.
describe('autoPodNextRole', () => {
  const nobody = { venue_claim: null, host_claim: null, club_claim: null };

  it('names the venue, then the host, then the club admin, then nobody', () => {
    expect(autoPodNextRole(nobody)).toBe('venue');
    expect(autoPodNextRole({ ...nobody, venue_claim: claim })).toBe('host');
    expect(autoPodNextRole({ ...nobody, venue_claim: claim, host_claim: claim })).toBe('club');
    expect(autoPodNextRole({ venue_claim: claim, host_claim: claim, club_claim: claim })).toBeNull();
  });

  it('skips the venue on a virtual offer', () => {
    expect(autoPodNextRole({ ...nobody, pod_mode: 'VIRTUAL' })).toBe('host');
    expect(autoPodNextRole({ ...nobody, pod_mode: 'VIRTUAL', host_claim: claim })).toBe('club');
  });

  it('is written once more as the Mongo clause each later queue carries', () => {
    expect(HOST_TURN_FILTER).toEqual({
      $or: [{ pod_mode: 'VIRTUAL' }, { venue_claim: { $ne: null } }],
    });
    expect(CLUB_TURN_FILTER).toEqual({ host_claim: { $ne: null } });
  });
});

// The venue window restarts when a venue withdraws, and rows from before the
// field existed still count from creation.
describe('the venue window', () => {
  const cutoff = new Date('2026-09-01T00:00:00.000Z');

  it('is open past venue_window_from, or past created_at when there is none', () => {
    expect(venueWindowOpen(cutoff)).toEqual({
      $or: [
        { venue_window_from: { $gt: cutoff } },
        { venue_window_from: null, created_at: { $gt: cutoff } },
      ],
    });
  });

  it('has passed by the mirror-image clause', () => {
    expect(venueWindowPassed(cutoff)).toEqual({
      $or: [
        { venue_window_from: { $lte: cutoff } },
        { venue_window_from: null, created_at: { $lte: cutoff } },
      ],
    });
  });
});

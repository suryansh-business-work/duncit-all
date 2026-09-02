/**
 * The completeness rule every Auto Pod path shares: a host and a club always,
 * a venue only for a physical offer. Written once here and once as a Mongo
 * filter, so both are checked against the same cases.
 */
import { AUTO_POD_COMPLETE_FILTER, isAutoPodComplete, PHYSICAL_FILTER } from '../../autoPod.common';

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

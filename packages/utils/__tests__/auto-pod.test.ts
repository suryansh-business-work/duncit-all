import { describe, expect, it } from 'vitest';
import {
  autoPodActionable,
  autoPodCityLabel,
  autoPodEnrolledCount,
  autoPodHostNeedsLocation,
  autoPodMissingRoles,
  autoPodModeCount,
  autoPodNextRole,
  autoPodRoles,
  autoPodTicks,
  autoPodTimeLeft,
  autoPodWaitingOn,
  autoPodWithdrawable,
  splitAutoPods,
  type AutoPodClubClaim,
  type AutoPodHostClaim,
  type AutoPodRow,
  type AutoPodVenueClaim,
} from '../src/auto-pod';

const venueClaim: AutoPodVenueClaim = {
  venue_id: 'v1',
  venue_slot_id: 's1',
  owner_user_id: 'owner-1',
  venue_name: 'Hall A',
  pod_date_time: '2026-09-01T10:00:00.000Z',
  pod_end_date_time: null,
  slot_price: 500,
  accepted_at: '2026-08-20T10:00:00.000Z',
};

const hostClaim: AutoPodHostClaim = {
  user_id: 'host-1',
  host_name: 'Asha',
  assigned_at: '2026-08-20T11:00:00.000Z',
};

const clubClaim: AutoPodClubClaim = {
  club_id: 'c1',
  club_name: 'Runners',
  user_id: 'admin-1',
  claimed_at: '2026-08-20T12:00:00.000Z',
};

/** An OPEN, unclaimed Auto Pod row, with only the fields under test set deliberately. */
const row = (over: Partial<AutoPodRow> = {}): AutoPodRow => ({
  id: 'ap1',
  auto_pod_no: 'DUN-AP-1',
  stage: 'OPEN',
  pod_title: 'Morning run',
  pod_description: '',
  pod_images_and_videos: [],
  sub_category_id: 'sub-1',
  pod_amount: 300,
  no_of_spots: 10,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  viewer_claimed: false,
  ...over,
});

/** A row every partner has enrolled in. */
const fullyClaimed = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  row({ stage: 'CLAIMING', venue_claim: venueClaim, host_claim: hostClaim, club_claim: clubClaim, ...over });

describe('autoPodTicks', () => {
  it('always lists the three partners in enrolment order, Venue first', () => {
    // A card's tick row must never change width as partners enrol.
    expect(autoPodTicks(row()).map((t) => t.role)).toEqual(['venue', 'host', 'club']);
    expect(autoPodTicks(fullyClaimed()).map((t) => t.role)).toEqual(['venue', 'host', 'club']);
  });

  it('marks a tick done only once that partner has a claim', () => {
    expect(autoPodTicks(row())).toEqual([
      { role: 'venue', done: false },
      { role: 'host', done: false },
      { role: 'club', done: false },
    ]);
    expect(autoPodTicks(row({ host_claim: hostClaim }))).toEqual([
      { role: 'venue', done: false },
      { role: 'host', done: true },
      { role: 'club', done: false },
    ]);
    expect(autoPodTicks(row({ venue_claim: venueClaim, club_claim: clubClaim }))).toEqual([
      { role: 'venue', done: true },
      { role: 'host', done: false },
      { role: 'club', done: true },
    ]);
  });
});

describe('autoPodEnrolledCount', () => {
  it('counts how many of the three partners have enrolled', () => {
    expect(autoPodEnrolledCount(row())).toBe(0);
    expect(autoPodEnrolledCount(row({ venue_claim: venueClaim }))).toBe(1);
    expect(autoPodEnrolledCount(row({ venue_claim: venueClaim, club_claim: clubClaim }))).toBe(2);
    expect(autoPodEnrolledCount(fullyClaimed())).toBe(3);
  });
});

describe('autoPodActionable', () => {
  // Enrolment runs venue → host → club admin: a role's button appears only on
  // its turn, and the viewer's own claim always takes it away.
  it('never offers a row the viewer already took', () => {
    expect(autoPodActionable(row({ viewer_claimed: true }), 'venue')).toBe(false);
    expect(autoPodActionable(row({ stage: 'CLAIMING', venue_claim: venueClaim, viewer_claimed: true }), 'host')).toBe(false);
  });

  it('starts with the venue on a physical offer, and with the host on a virtual one', () => {
    expect(autoPodActionable(row(), 'venue')).toBe(true);
    expect(autoPodActionable(row(), 'host')).toBe(false);
    expect(autoPodActionable(row(), 'club')).toBe(false);
    expect(autoPodActionable(row({ pod_mode: 'VIRTUAL' }), 'venue')).toBe(false);
    expect(autoPodActionable(row({ pod_mode: 'VIRTUAL' }), 'host')).toBe(true);
    expect(autoPodActionable(row({ pod_mode: 'VIRTUAL' }), 'club')).toBe(false);
  });

  it('hands the offer to a host once a venue has fixed a slot, and to a club admin once a host is on it', () => {
    const withVenue = row({ stage: 'CLAIMING', venue_claim: venueClaim });
    expect(autoPodActionable(withVenue, 'venue')).toBe(false);
    expect(autoPodActionable(withVenue, 'host')).toBe(true);
    expect(autoPodActionable(withVenue, 'club')).toBe(false);
    const withHost = row({ stage: 'CLAIMING', venue_claim: venueClaim, host_claim: hostClaim });
    expect(autoPodActionable(withHost, 'host')).toBe(false);
    expect(autoPodActionable(withHost, 'club')).toBe(true);
    expect(autoPodActionable(fullyClaimed(), 'club')).toBe(false);
  });

  it('offers nothing once the row is materializing, live, cancelled or expired', () => {
    for (const stage of ['MATERIALIZING', 'LIVE', 'CANCELLED', 'EXPIRED'] as const) {
      expect(autoPodActionable(row({ stage }), 'venue')).toBe(false);
      expect(autoPodActionable(row({ stage, venue_claim: venueClaim }), 'host')).toBe(false);
      expect(autoPodActionable(row({ stage, venue_claim: venueClaim, host_claim: hostClaim }), 'club')).toBe(false);
    }
  });
});

describe('autoPodNextRole', () => {
  it('names whose turn it is, in order, and null once nobody is missing', () => {
    expect(autoPodNextRole(row())).toBe('venue');
    expect(autoPodNextRole(row({ venue_claim: venueClaim }))).toBe('host');
    expect(autoPodNextRole(row({ venue_claim: venueClaim, host_claim: hostClaim }))).toBe('club');
    expect(autoPodNextRole(fullyClaimed())).toBeNull();
    expect(autoPodNextRole(row({ pod_mode: 'VIRTUAL' }))).toBe('host');
  });
});

describe('autoPodWithdrawable', () => {
  it('lets a venue or host take back their own enrolment while the offer is still enrolling', () => {
    expect(autoPodWithdrawable(row({ stage: 'CLAIMING', venue_claim: venueClaim, viewer_claimed: true }), 'venue')).toBe(true);
    expect(autoPodWithdrawable(row({ stage: 'CLAIMING', venue_claim: venueClaim, host_claim: hostClaim, viewer_claimed: true }), 'host')).toBe(true);
    // Not theirs, or not their role's claim.
    expect(autoPodWithdrawable(row({ stage: 'CLAIMING', venue_claim: venueClaim }), 'venue')).toBe(false);
    expect(autoPodWithdrawable(row({ stage: 'CLAIMING', venue_claim: venueClaim, viewer_claimed: true }), 'host')).toBe(false);
  });

  it('never offers it to a club admin, nor on an offer that is no longer enrolling', () => {
    expect(autoPodWithdrawable(fullyClaimed({ viewer_claimed: true }), 'club')).toBe(false);
    expect(autoPodWithdrawable(row({ stage: 'LIVE', venue_claim: venueClaim, viewer_claimed: true }), 'venue')).toBe(false);
  });
});

describe('splitAutoPods', () => {
  it('puts rows a role can act on first and the ones they already took second', () => {
    const open = row({ id: 'open' });
    const taken = row({ id: 'taken', stage: 'CLAIMING', venue_claim: venueClaim, viewer_claimed: true });
    const { actionable, mine } = splitAutoPods([open, taken], 'venue');
    expect(actionable.map((r) => r.id)).toEqual(['open']);
    expect(mine.map((r) => r.id)).toEqual(['taken']);
  });

  // A row somebody ELSE claimed is neither a job for this viewer nor theirs to
  // watch — it drops out of the queue entirely rather than polluting either list.
  it('drops rows that are neither actionable nor the viewer’s own', () => {
    const someoneElses = row({ id: 'other', venue_claim: venueClaim, stage: 'CLAIMING' });
    const live = row({ id: 'live', stage: 'LIVE' });
    // The same LIVE row, but one the viewer enrolled in: that one stays theirs
    // to watch, so `viewer_claimed` is exactly what separates kept from dropped.
    const liveMine = row({ id: 'live-mine', stage: 'LIVE', viewer_claimed: true });
    const open = row({ id: 'open' });
    const { actionable, mine } = splitAutoPods([someoneElses, open, live, liveMine], 'venue');
    expect(actionable.map((r) => r.id)).toEqual(['open']);
    expect(mine.map((r) => r.id)).toEqual(['live-mine']);
  });

  it('keeps the incoming order within each group', () => {
    // Deliberately not alphabetical, so a sorted result would be caught.
    const rows = ['c', 'a', 'b'].map((id) => row({ id }));
    expect(splitAutoPods(rows, 'venue').actionable.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    const mineRows = ['y', 'x'].map((id) => row({ id, viewer_claimed: true }));
    expect(splitAutoPods(mineRows, 'host').mine.map((r) => r.id)).toEqual(['y', 'x']);
  });

  it('splits by the role asked for: only the role whose turn it is sees the row', () => {
    const claiming = row({ id: 'c', stage: 'CLAIMING', venue_claim: venueClaim });
    expect(splitAutoPods([claiming], 'venue').actionable).toEqual([]);
    expect(splitAutoPods([claiming], 'host').actionable.map((r) => r.id)).toEqual(['c']);
    // The club admin's turn comes only once a host is on it.
    expect(splitAutoPods([claiming], 'club').actionable).toEqual([]);
    const hosted = row({ id: 'h', stage: 'CLAIMING', venue_claim: venueClaim, host_claim: hostClaim });
    expect(splitAutoPods([hosted], 'club').actionable.map((r) => r.id)).toEqual(['h']);
  });

  it('returns two empty lists for an empty queue', () => {
    expect(splitAutoPods([], 'club')).toEqual({ actionable: [], mine: [] });
  });
});

describe('autoPodWaitingOn', () => {
  it('waits on the venue first, because nothing happens until a date is committed', () => {
    expect(autoPodWaitingOn(row())).toBe('venue');
    // Even with a host and club already in, a missing venue is still the blocker.
    expect(autoPodWaitingOn(row({ host_claim: hostClaim, club_claim: clubClaim }))).toBe('venue');
  });

  it('then waits on the host, then the club', () => {
    expect(autoPodWaitingOn(row({ stage: 'CLAIMING', venue_claim: venueClaim }))).toBe('host');
    expect(autoPodWaitingOn(row({ stage: 'CLAIMING', venue_claim: venueClaim, host_claim: hostClaim }))).toBe('club');
  });

  it('waits on nobody once all three have enrolled', () => {
    expect(autoPodWaitingOn(fullyClaimed())).toBeNull();
  });

  it('waits on nobody once the row is live or gone, whatever claims it carries', () => {
    for (const stage of ['MATERIALIZING', 'LIVE', 'CANCELLED', 'EXPIRED'] as const) {
      expect(autoPodWaitingOn(row({ stage }))).toBeNull();
      expect(autoPodWaitingOn(fullyClaimed({ stage }))).toBeNull();
    }
  });
});

describe('autoPodModeCount', () => {
  const counts = { venue: 2, host: 5, club: 1 };

  it('maps each studio mode to its own role’s count', () => {
    expect(autoPodModeCount(counts, 'VENUE')).toBe(2);
    expect(autoPodModeCount(counts, 'HOST')).toBe(5);
    expect(autoPodModeCount(counts, 'CLUB')).toBe(1);
  });

  // USER and ECOMM have no Auto Pod queue, so a switch into them never lands
  // on Auto Pods — they fall through to their usual home.
  it('is 0 for modes that have no Auto Pod queue', () => {
    expect(autoPodModeCount(counts, 'USER')).toBe(0);
    expect(autoPodModeCount(counts, 'ECOMM')).toBe(0);
    // Modes are the upper-case studio names; a stray lower-case role is not one.
    expect(autoPodModeCount(counts, 'host')).toBe(0);
  });

  it('is 0 before the counts have been fetched', () => {
    expect(autoPodModeCount(null, 'HOST')).toBe(0);
    expect(autoPodModeCount(undefined, 'HOST')).toBe(0);
  });

  it('treats a role missing from a partial payload as nothing waiting', () => {
    const partial = { venue: 3 } as unknown as typeof counts;
    expect(autoPodModeCount(partial, 'HOST')).toBe(0);
    expect(autoPodModeCount(partial, 'VENUE')).toBe(3);
  });
});

describe('autoPodHostNeedsLocation', () => {
  const pinned = {
    location: {
      location_id: 'loc-1',
      location_name: 'Bengaluru',
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      bound_by: 'VENUE' as const,
      bound_at: '2026-08-20T10:00:00.000Z',
    },
  };

  // An unpinned offer takes its city FROM the host, so there has to be one.
  it('asks the host for a city only on an offer nobody has pinned yet', () => {
    expect(autoPodHostNeedsLocation({ location: null }, '')).toBe(true);
    expect(autoPodHostNeedsLocation({ location: null }, 'loc-1')).toBe(false);
  });

  it('never asks once the first enrolment pinned the city', () => {
    expect(autoPodHostNeedsLocation(pinned, '')).toBe(false);
    expect(autoPodHostNeedsLocation(pinned, 'loc-9')).toBe(false);
  });
});

describe('autoPodCityLabel', () => {
  const location = {
    location_id: 'loc-1',
    location_name: 'Bengaluru Urban',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    bound_by: 'HOST' as const,
    bound_at: '2026-08-20T10:00:00.000Z',
  };

  it('names the pinned city and its state, the way every card reads', () => {
    expect(autoPodCityLabel(location)).toBe('Bengaluru, Karnataka');
  });

  it('falls back to the admin location row when the city column is blank', () => {
    expect(autoPodCityLabel({ ...location, city: '' })).toBe('Bengaluru Urban, Karnataka');
  });

  it('drops the missing half rather than trailing a comma', () => {
    expect(autoPodCityLabel({ ...location, state: '' })).toBe('Bengaluru');
  });

  it('is empty for an offer nobody has pinned yet', () => {
    expect(autoPodCityLabel(null)).toBe('');
    expect(autoPodCityLabel(undefined)).toBe('');
  });
});

describe('a virtual offer', () => {
  // The admin wrote the meeting details and the dates into the template, so
  // there is no venue to enrol: every derivation is two roles wide.
  const virtual = (over: Partial<AutoPodRow> = {}): AutoPodRow => row({ pod_mode: 'VIRTUAL', ...over });

  it('needs a host and a club only, in the same order as ever', () => {
    expect(autoPodRoles(virtual())).toEqual(['host', 'club']);
    expect(autoPodRoles(row())).toEqual(['venue', 'host', 'club']);
    // A row from before the field existed is physical.
    expect(autoPodRoles(row({ pod_mode: null }))).toEqual(['venue', 'host', 'club']);
  });

  it('draws two ticks and counts against two', () => {
    expect(autoPodTicks(virtual({ host_claim: hostClaim }))).toEqual([
      { role: 'host', done: true },
      { role: 'club', done: false },
    ]);
    expect(autoPodEnrolledCount(virtual({ host_claim: hostClaim, club_claim: clubClaim }))).toBe(2);
  });

  it('is never a venue’s to act on: the host goes first, then the club', () => {
    expect(autoPodActionable(virtual(), 'venue')).toBe(false);
    expect(autoPodActionable(virtual(), 'host')).toBe(true);
    expect(autoPodActionable(virtual(), 'club')).toBe(false);
    expect(autoPodActionable(virtual({ stage: 'CLAIMING', host_claim: hostClaim }), 'club')).toBe(true);
  });

  it('waits on the host and the club only', () => {
    expect(autoPodMissingRoles(virtual())).toEqual(['host', 'club']);
    expect(autoPodWaitingOn(virtual({ stage: 'CLAIMING', host_claim: hostClaim }))).toBe('club');
    expect(autoPodMissingRoles(row())).toEqual(['venue', 'host', 'club']);
  });
});

describe('autoPodTimeLeft', () => {
  const now = Date.UTC(2026, 8, 2, 10, 0, 0);

  it('splits what is left into whole hours and the minutes over, rounding minutes up', () => {
    expect(autoPodTimeLeft(new Date(now + 5 * 3_600_000 + 12 * 60_000).toISOString(), now)).toEqual({ hours: 5, minutes: 12 });
    // Ten seconds left still reads as a minute, never "0h 0m" while the offer is there.
    expect(autoPodTimeLeft(new Date(now + 10_000).toISOString(), now)).toEqual({ hours: 0, minutes: 1 });
    expect(autoPodTimeLeft(new Date(now + 24 * 3_600_000).toISOString(), now)).toEqual({ hours: 24, minutes: 0 });
  });

  it('is null with no deadline, a past one, or an unreadable one', () => {
    expect(autoPodTimeLeft(null, now)).toBeNull();
    expect(autoPodTimeLeft(undefined, now)).toBeNull();
    expect(autoPodTimeLeft(new Date(now - 1).toISOString(), now)).toBeNull();
    expect(autoPodTimeLeft('not a date', now)).toBeNull();
  });
});

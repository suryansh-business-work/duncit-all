import { describe, expect, it } from 'vitest';
import {
  canRequestPodChange,
  canWithdrawChangeRequest,
  changePenaltyFor,
  changeRequestBlockedKey,
  changeRequestConfirmKey,
  changeRequestMenuKey,
  changeRequestPodLink,
  changeRequestRoleKey,
  changeRequestStatusKey,
  changeRequestTone,
  isChangeRequestLive,
  splitChangeRequests,
  type PodChangeRow,
} from '../src/pod-change-request';

/** A change request, with only the fields under test set deliberately. */
const row = (over: Partial<PodChangeRow> = {}): PodChangeRow => ({
  id: '665f2c1ab3d4e5f60718293a',
  change_request_no: 'DUN-CRQ-000042',
  role: 'VENUE',
  status: 'OPEN',
  resolution: 'NONE',
  reason: 'Court 2 is flooded after the storm.',
  health_penalty: 5,
  attendees_at_request: 8,
  pod: {
    id: '665f2c1ab3d4e5f607182900',
    pod_slug: 'sunday-badminton-doubles',
    pod_title: 'Sunday Badminton Doubles',
    pod_date_time: '2026-09-13T01:30:00.000Z',
    club_slug: 'noida-racquet-club',
    attendee_count: 8,
  },
  pod_cancelled: false,
  requested_by: {
    user_id: '665f2c1ab3d4e5f607182911',
    full_name: 'Rohit Sharma',
    email: 'rohit@sector62arena.in',
    phone: '+919812345670',
  },
  from_venue_id: '665f2c1ab3d4e5f607182922',
  from_venue_name: 'Sector 62 Sports Arena',
  from_club_id: null,
  from_club_name: '',
  offer: null,
  offer_history: [],
  events: [],
  created_at: '2026-09-04T06:10:00.000Z',
  resolved_at: null,
  ...over,
});

describe('changePenaltyFor', () => {
  const penalties = { venue_penalty: 5, host_penalty: 3, club_admin_penalty: 2 };

  it('reads the number for each role off the board', () => {
    expect(changePenaltyFor(penalties, 'VENUE')).toBe(5);
    expect(changePenaltyFor(penalties, 'HOST')).toBe(3);
    expect(changePenaltyFor(penalties, 'CLUB_ADMIN')).toBe(2);
  });

  it('answers 0 before the board has loaded, never undefined', () => {
    // The confirm dialog prints this number; undefined would render "NaN points".
    expect(changePenaltyFor(null, 'VENUE')).toBe(0);
    expect(changePenaltyFor(undefined, 'HOST')).toBe(0);
  });
});

describe('isChangeRequestLive', () => {
  it('counts OPEN and OFFERED — the two states that hold the per-pod lock', () => {
    expect(isChangeRequestLive({ status: 'OPEN' })).toBe(true);
    expect(isChangeRequestLive({ status: 'OFFERED' })).toBe(true);
  });

  it('does not count a settled request', () => {
    expect(isChangeRequestLive({ status: 'RESOLVED' })).toBe(false);
    expect(isChangeRequestLive({ status: 'WITHDRAWN' })).toBe(false);
  });
});

describe('canRequestPodChange', () => {
  it('allows a pod that is still running', () => {
    expect(canRequestPodChange({})).toBe(true);
    expect(canRequestPodChange({ completed_at: null, cancelled_at: null, is_deleted: false })).toBe(
      true,
    );
  });

  it('refuses a pod with nothing left to hand over', () => {
    expect(canRequestPodChange({ completed_at: '2026-09-14T04:00:00.000Z' })).toBe(false);
    expect(canRequestPodChange({ cancelled_at: '2026-09-10T04:00:00.000Z' })).toBe(false);
    expect(canRequestPodChange({ is_deleted: true })).toBe(false);
  });
});

describe('changeRequestBlockedKey', () => {
  it('is null when the action is open', () => {
    expect(changeRequestBlockedKey({}, null)).toBeNull();
    expect(changeRequestBlockedKey({}, undefined)).toBeNull();
    expect(changeRequestBlockedKey({}, { status: 'RESOLVED' })).toBeNull();
  });

  it('names the closed pod first — it outranks an open request', () => {
    expect(changeRequestBlockedKey({ completed_at: '2026-09-14T04:00:00.000Z' }, null)).toBe(
      'changeRequest.blockedClosed',
    );
    expect(
      changeRequestBlockedKey({ is_deleted: true }, { status: 'OPEN' }),
    ).toBe('changeRequest.blockedClosed');
  });

  it('names an already-open request, so a partner is not charged twice', () => {
    expect(changeRequestBlockedKey({}, { status: 'OPEN' })).toBe('changeRequest.blockedOpen');
    expect(changeRequestBlockedKey({}, { status: 'OFFERED' })).toBe('changeRequest.blockedOpen');
  });
});

describe('key builders', () => {
  it('gives each role its own literal menu key', () => {
    expect(changeRequestMenuKey('VENUE')).toBe('changeRequest.menuVenue');
    expect(changeRequestMenuKey('HOST')).toBe('changeRequest.menuHost');
    expect(changeRequestMenuKey('CLUB_ADMIN')).toBe('changeRequest.menuClubAdmin');
  });

  it('gives each role its own confirm body', () => {
    expect(changeRequestConfirmKey('VENUE')).toBe('changeRequest.confirmVenue');
    expect(changeRequestConfirmKey('HOST')).toBe('changeRequest.confirmHost');
    expect(changeRequestConfirmKey('CLUB_ADMIN')).toBe('changeRequest.confirmClubAdmin');
  });

  it('names the role for a chip', () => {
    expect(changeRequestRoleKey('VENUE')).toBe('changeRequest.roleVenue');
    expect(changeRequestRoleKey('HOST')).toBe('changeRequest.roleHost');
    expect(changeRequestRoleKey('CLUB_ADMIN')).toBe('changeRequest.roleClubAdmin');
  });
});

describe('changeRequestStatusKey', () => {
  it('names the live states', () => {
    expect(changeRequestStatusKey({ status: 'OPEN', resolution: 'NONE' })).toBe(
      'changeRequest.statusOpen',
    );
    expect(changeRequestStatusKey({ status: 'OFFERED', resolution: 'NONE' })).toBe(
      'changeRequest.statusOffered',
    );
    expect(changeRequestStatusKey({ status: 'WITHDRAWN', resolution: 'NONE' })).toBe(
      'changeRequest.statusWithdrawn',
    );
  });

  it('says HOW a resolved request ended, never the bare word', () => {
    // "Replaced" and "cancelled and refunded" are completely different outcomes
    // for the person who asked; one label for both hides the costly one.
    expect(changeRequestStatusKey({ status: 'RESOLVED', resolution: 'REPLACED' })).toBe(
      'changeRequest.resolvedReplaced',
    );
    expect(changeRequestStatusKey({ status: 'RESOLVED', resolution: 'POD_CANCELLED' })).toBe(
      'changeRequest.resolvedCancelled',
    );
  });

  it('falls back to the plain word for a resolution it does not recognise', () => {
    expect(changeRequestStatusKey({ status: 'RESOLVED', resolution: 'NONE' })).toBe(
      'changeRequest.statusResolved',
    );
  });
});

describe('changeRequestTone', () => {
  it('paints each state', () => {
    expect(changeRequestTone({ status: 'OPEN', resolution: 'NONE' })).toBe('warning');
    expect(changeRequestTone({ status: 'OFFERED', resolution: 'NONE' })).toBe('info');
    expect(changeRequestTone({ status: 'WITHDRAWN', resolution: 'NONE' })).toBe('default');
    expect(changeRequestTone({ status: 'RESOLVED', resolution: 'POD_CANCELLED' })).toBe('error');
    expect(changeRequestTone({ status: 'RESOLVED', resolution: 'REPLACED' })).toBe('success');
    expect(changeRequestTone({ status: 'RESOLVED', resolution: 'NONE' })).toBe('success');
  });
});

describe('splitChangeRequests', () => {
  it('puts what still needs an answer above what no longer does', () => {
    const rows = [
      row({ id: 'a', status: 'OPEN' }),
      row({ id: 'b', status: 'OFFERED' }),
      row({ id: 'c', status: 'RESOLVED', resolution: 'REPLACED' }),
      row({ id: 'd', status: 'WITHDRAWN' }),
    ];
    const { live, settled } = splitChangeRequests(rows);
    expect(live.map((r) => r.id)).toEqual(['a', 'b']);
    expect(settled.map((r) => r.id)).toEqual(['c', 'd']);
  });

  it('answers with two empty lists rather than throwing on an empty board', () => {
    expect(splitChangeRequests([])).toEqual({ live: [], settled: [] });
  });
});

describe('canWithdrawChangeRequest', () => {
  it('allows a pull-back only before anybody was offered it', () => {
    expect(canWithdrawChangeRequest({ status: 'OPEN' })).toBe(true);
  });

  it('refuses once an offer is out or the request is closed', () => {
    expect(canWithdrawChangeRequest({ status: 'OFFERED' })).toBe(false);
    expect(canWithdrawChangeRequest({ status: 'RESOLVED' })).toBe(false);
    expect(canWithdrawChangeRequest({ status: 'WITHDRAWN' })).toBe(false);
  });
});

describe('changeRequestPodLink', () => {
  it('builds the public pod address', () => {
    expect(changeRequestPodLink(row())).toBe(
      '/club/noida-racquet-club/pod/sunday-badminton-doubles',
    );
  });

  it('answers null rather than a half-built path when a slug is missing', () => {
    // A pod whose club slug never resolved would otherwise link to /club//pod/x.
    expect(changeRequestPodLink(row({ pod: { ...row().pod, club_slug: '' } }))).toBeNull();
    expect(changeRequestPodLink(row({ pod: { ...row().pod, pod_slug: '' } }))).toBeNull();
  });
});

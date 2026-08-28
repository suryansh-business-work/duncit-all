import { describe, expect, it } from 'vitest';
import {
  backoutAttemptsLeft,
  buildPodParticipationTimeline,
  isBackoutMaxed,
  isPodPast,
  participationInputFrom,
  podParticipationActions,
  podRefundState,
  type PodBackoutRequestInput,
  type PodCancelActor,
  type PodParticipationInput,
  type PodTimelineNode,
} from '../src/pod-participation';

/**
 * A frozen "now", so every test reads the same clock.
 *
 * Deliberately years AHEAD of the wall clock: PAST is "past" only relative to
 * this injected now, so an implementation that quietly read `new Date()`
 * instead of `input.now` would call PAST a future pod and fail below. A fixture
 * dated "today" cannot tell the two clocks apart.
 */
const NOW = new Date('2031-03-10T12:00:00.000Z');
const JOINED_AT = '2031-02-20T09:00:00.000Z';
/** A pod that has already happened, and one still ahead, relative to NOW. */
const PAST = '2031-03-09T10:00:00.000Z';
const FUTURE = '2031-03-14T10:00:00.000Z';
const REQUESTED_AT = '2031-03-01T09:00:00.000Z';
const FILLED_AT = '2031-03-03T09:00:00.000Z';
const PROCESSED_AT = '2031-03-04T09:00:00.000Z';
const CANCELLED_AT = '2031-03-06T09:00:00.000Z';

/** One backout request with only the fields under test set deliberately. */
const backout = (over: Partial<PodBackoutRequestInput> = {}): PodBackoutRequestInput => ({
  backout_no: 'DUN-BKO-0001',
  status: 'IN_PROCESS',
  attempt_no: 1,
  seats: 1,
  seats_before: 1,
  created_at: REQUESTED_AT,
  ...over,
});

/** A booking on a pod still ahead, with the clock injected. */
const input = (over: Partial<PodParticipationInput> = {}): PodParticipationInput => ({
  joinedAt: JOINED_AT,
  podDateTime: FUTURE,
  now: NOW,
  ...over,
});

const kinds = (nodes: PodTimelineNode[]) => nodes.map((node) => node.kind);

describe('participationInputFrom', () => {
  it('maps the API field names onto the builder input one-to-one', () => {
    const backouts = [backout()];
    expect(
      participationInputFrom(
        {
          joined_at: JOINED_AT,
          attended: true,
          attended_at: PAST,
          attendance_recorded: true,
          pod_cancelled_by: 'VENUE',
          pod_cancelled_at: CANCELLED_AT,
          cancel_refund_status: 'PENDING',
          refund_status: 'PROCESSED',
          backouts,
        },
        PAST,
      ),
    ).toEqual({
      joinedAt: JOINED_AT,
      podDateTime: PAST,
      attended: true,
      attendedAt: PAST,
      attendanceRecorded: true,
      cancelledBy: 'VENUE',
      cancelledAt: CANCELLED_AT,
      cancelRefundStatus: 'PENDING',
      refundStatus: 'PROCESSED',
      backouts,
    });
  });

  // A member row with no participation yet must still build a timeline rather
  // than crash the screen, so every field gets its "nothing happened" default.
  it('defaults every field when the API sent no participation at all', () => {
    const expected = {
      joinedAt: '',
      podDateTime: undefined,
      attended: false,
      attendedAt: undefined,
      attendanceRecorded: false,
      cancelledBy: null,
      cancelledAt: undefined,
      cancelRefundStatus: null,
      refundStatus: null,
      backouts: [],
    };
    expect(participationInputFrom(null)).toEqual(expected);
    expect(participationInputFrom(undefined)).toEqual(expected);
  });

  // The flags and statuses collapse to their "nothing happened" defaults; the
  // two timestamps are pass-through fields, so a null stays a null there.
  it('defaults the flags and statuses on an explicit null, and passes null timestamps through', () => {
    const out = participationInputFrom({
      joined_at: null,
      attended: null,
      attended_at: null,
      attendance_recorded: null,
      pod_cancelled_by: null,
      pod_cancelled_at: null,
      cancel_refund_status: null,
      refund_status: null,
      backouts: null,
    });
    expect(out).toMatchObject({
      joinedAt: '',
      attended: false,
      attendanceRecorded: false,
      cancelledBy: null,
      cancelRefundStatus: null,
      refundStatus: null,
      backouts: [],
    });
    expect(out.attendedAt).toBeNull();
    expect(out.cancelledAt).toBeNull();
  });

  it('carries the pod date through untouched, including a pod with no date yet', () => {
    expect(participationInputFrom({}, FUTURE).podDateTime).toBe(FUTURE);
    expect(participationInputFrom({}, null).podDateTime).toBeNull();
  });
});

describe('isPodPast', () => {
  it('is true once the start time is behind the clock', () => {
    expect(isPodPast(PAST, NOW)).toBe(true);
  });

  it('is false while the start time is still ahead, and at the exact start second', () => {
    expect(isPodPast(FUTURE, NOW)).toBe(false);
    // A pod starting right now has not happened yet; the attendance flow must
    // not appear a second before the host could have scanned anybody.
    expect(isPodPast(NOW.toISOString(), NOW)).toBe(false);
  });

  it('is false for a pod with no date yet', () => {
    expect(isPodPast(null, NOW)).toBe(false);
    expect(isPodPast(undefined, NOW)).toBe(false);
    expect(isPodPast('', NOW)).toBe(false);
  });

  it('is false for a date that cannot be parsed rather than comparing NaN', () => {
    expect(isPodPast('not-a-date', NOW)).toBe(false);
  });

  it('reads the real clock when no now is injected', () => {
    expect(isPodPast('2000-01-01T00:00:00.000Z')).toBe(true);
    expect(isPodPast('2999-01-01T00:00:00.000Z')).toBe(false);
  });
});

describe('buildPodParticipationTimeline', () => {
  describe('flows 1 and 2: the date arrives', () => {
    it('starts every story with JOINED at the join time', () => {
      const [first] = buildPodParticipationTimeline(input());
      expect(first).toEqual({ kind: 'JOINED', at: JOINED_AT, state: 'done' });
    });

    it('stops at JOINED while the pod is still ahead', () => {
      expect(kinds(buildPodParticipationTimeline(input()))).toEqual(['JOINED']);
    });

    it('flow 1: the date arrives and the host scanned them in', () => {
      const attendedAt = '2031-03-09T10:05:00.000Z';
      const nodes = buildPodParticipationTimeline(
        input({ podDateTime: PAST, attended: true, attendedAt, attendanceRecorded: true }),
      );
      expect(nodes).toEqual([
        { kind: 'JOINED', at: JOINED_AT, state: 'done' },
        { kind: 'DATE_ARRIVES', at: PAST, state: 'done' },
        { kind: 'ATTENDED', at: attendedAt, state: 'done' },
      ]);
    });

    it('stamps ATTENDED with the pod time when the scan time is unknown', () => {
      const nodes = buildPodParticipationTimeline(
        input({ podDateTime: PAST, attended: true, attendedAt: null }),
      );
      expect(nodes[2]).toEqual({ kind: 'ATTENDED', at: PAST, state: 'done' });
    });

    it('flow 2: attendance was taken and they were not there', () => {
      const nodes = buildPodParticipationTimeline(
        input({ podDateTime: PAST, attended: false, attendanceRecorded: true }),
      );
      expect(nodes.slice(1)).toEqual([
        { kind: 'DATE_ARRIVES', at: PAST, state: 'done' },
        { kind: 'NOT_ATTENDED', at: PAST, state: 'done' },
      ]);
    });

    // "You did not attend" is a claim the system cannot make about a virtual
    // pod or a host who never opened the scanner.
    it('refuses to say "not attended" when nobody took attendance', () => {
      const unrecorded = buildPodParticipationTimeline(
        input({ podDateTime: PAST, attended: false, attendanceRecorded: false }),
      );
      expect(kinds(unrecorded)).toEqual(['JOINED', 'DATE_ARRIVES', 'ATTENDANCE_NOT_RECORDED']);
      expect(unrecorded[2].at).toBe(PAST);

      const unknown = buildPodParticipationTimeline(input({ podDateTime: PAST }));
      expect(kinds(unknown)).toEqual(['JOINED', 'DATE_ARRIVES', 'ATTENDANCE_NOT_RECORDED']);
    });

    it('reads the real clock when no now is injected', () => {
      const { now: _omitted, ...noClock } = input({
        podDateTime: '2000-01-01T00:00:00.000Z',
        attended: true,
      });
      expect(kinds(buildPodParticipationTimeline(noClock))).toEqual([
        'JOINED',
        'DATE_ARRIVES',
        'ATTENDED',
      ]);
    });
  });

  describe('flow 3: backout requested', () => {
    it('draws every request as its own branch, carrying the DUN-BKO id and the seats', () => {
      const nodes = buildPodParticipationTimeline(
        input({
          backouts: [
            backout({ backout_no: 'DUN-BKO-0001', seats: 1, seats_before: 3, status: 'SPOT_FILLED' }),
            backout({
              backout_no: 'DUN-BKO-0002',
              attempt_no: 2,
              seats: 1,
              seats_before: 2,
              created_at: '2031-03-02T09:00:00.000Z',
            }),
          ],
        }),
      );
      expect(kinds(nodes)).toEqual(['JOINED', 'BACKOUT_REQUESTED', 'BACKOUT_REQUESTED']);
      expect(nodes[1]).toMatchObject({
        at: REQUESTED_AT,
        state: 'done',
        backoutNo: 'DUN-BKO-0001',
        seats: 1,
        seatsBefore: 3,
      });
      expect(nodes[2]).toMatchObject({
        at: '2031-03-02T09:00:00.000Z',
        backoutNo: 'DUN-BKO-0002',
        seats: 1,
        seatsBefore: 2,
      });
    });

    // The seat is on sale and somebody may still take it; announcing an
    // outcome before the pod happens would be a lie either way.
    it('an open request on a pod still ahead is FINDING_REPLACEMENT, not a failure', () => {
      const [, request] = buildPodParticipationTimeline(input({ backouts: [backout()] }));
      expect(request.children).toEqual([
        { kind: 'FINDING_REPLACEMENT', state: 'current', backoutNo: 'DUN-BKO-0001' },
      ]);
    });

    it('a filled seat leads to a refund that is owed, stamped with the fill event', () => {
      const [, request] = buildPodParticipationTimeline(
        input({
          backouts: [
            backout({
              status: 'SPOT_FILLED',
              events: [
                { status: 'IN_PROCESS', at: REQUESTED_AT },
                { status: 'SPOT_FILLED', at: FILLED_AT },
              ],
            }),
          ],
        }),
      );
      expect(request.children).toEqual([
        {
          kind: 'SPOT_FILLED',
          at: FILLED_AT,
          state: 'done',
          backoutNo: 'DUN-BKO-0001',
          children: [{ kind: 'REFUND_PENDING', state: 'current', backoutNo: 'DUN-BKO-0001' }],
        },
      ]);
    });

    it('a filled seat whose refund went out reads REFUND_INITIATED at the processed time', () => {
      const [, request] = buildPodParticipationTimeline(
        input({
          backouts: [backout({ status: 'SPOT_FILLED', refund_processed_at: PROCESSED_AT })],
        }),
      );
      expect(request.children?.[0].children).toEqual([
        { kind: 'REFUND_INITIATED', at: PROCESSED_AT, state: 'done', backoutNo: 'DUN-BKO-0001' },
      ]);
    });

    it('a kept spot ends there: nothing was released, so nothing is owed', () => {
      const [, request] = buildPodParticipationTimeline(
        input({
          backouts: [
            backout({
              status: 'CANCELLED',
              events: [
                { status: 'IN_PROCESS', at: REQUESTED_AT },
                { status: 'CANCELLED', at: CANCELLED_AT },
              ],
            }),
          ],
        }),
      );
      expect(request.children).toEqual([
        { kind: 'KEPT_SPOT', at: CANCELLED_AT, state: 'done', backoutNo: 'DUN-BKO-0001' },
      ]);
    });

    it('an unfilled seat on a pod that has happened is the one case the policy declines', () => {
      const [, request] = buildPodParticipationTimeline(
        input({ podDateTime: PAST, backouts: [backout({ seats: 1, seats_before: 3 })] }),
      );
      expect(request.children).toEqual([
        {
          kind: 'SPOT_NOT_FILLED',
          state: 'done',
          backoutNo: 'DUN-BKO-0001',
          children: [{ kind: 'REFUND_NOT_ELIGIBLE', state: 'done', backoutNo: 'DUN-BKO-0001' }],
        },
      ]);
    });

    // Finance shows the per-request status for the same DUN-BKO id; the
    // timeline must never contradict it with its own derivation.
    it('the per-request refund status from the server outranks the derived fallback', () => {
      const refundOf = (request: PodBackoutRequestInput, podDateTime = FUTURE) => {
        const [, node] = buildPodParticipationTimeline(input({ podDateTime, backouts: [request] }));
        return node.children?.[0].children?.[0];
      };
      // A free booking whose seat was filled: owed nothing, whatever the fill says.
      expect(refundOf(backout({ status: 'SPOT_FILLED', refund_status: 'NOT_ELIGIBLE' }))).toEqual({
        kind: 'REFUND_NOT_ELIGIBLE',
        state: 'done',
        backoutNo: 'DUN-BKO-0001',
      });
      // Finance has the money in flight even though the seat was never filled.
      expect(refundOf(backout({ refund_status: 'PENDING' }), PAST)).toMatchObject({
        kind: 'REFUND_PENDING',
        state: 'current',
      });
      expect(refundOf(backout({ refund_status: 'PROCESSED' }), PAST)).toMatchObject({
        kind: 'REFUND_INITIATED',
        state: 'done',
      });
      // An explicit "not started" is not the same as absent: it is not re-derived.
      expect(refundOf(backout({ status: 'SPOT_FILLED', refund_status: 'NONE' }))).toMatchObject({
        kind: 'REFUND_NOT_ELIGIBLE',
      });
    });

    it('leaves the event time blank when the request carries no matching event', () => {
      const [, noEvents] = buildPodParticipationTimeline(
        input({ backouts: [backout({ status: 'SPOT_FILLED' })] }),
      );
      expect(noEvents.children?.[0].at).toBeNull();

      const [, otherEvents] = buildPodParticipationTimeline(
        input({
          backouts: [
            backout({ status: 'CANCELLED', events: [{ status: 'IN_PROCESS', at: REQUESTED_AT }] }),
          ],
        }),
      );
      expect(otherEvents.children?.[0].at).toBeNull();
    });

    it('a full backout ends the participation: no attendance flow once the pod has happened', () => {
      const nodes = buildPodParticipationTimeline(
        input({
          podDateTime: PAST,
          attended: true,
          backouts: [backout({ status: 'SPOT_FILLED', seats: 2, seats_before: 2 })],
        }),
      );
      expect(kinds(nodes)).toEqual(['JOINED', 'BACKOUT_REQUESTED']);

      // Flow 3 has no attendance leg either way: a seat they released and
      // nobody took is still a seat they gave up, even though a scan exists.
      const unfilled = buildPodParticipationTimeline(
        input({
          podDateTime: PAST,
          attended: true,
          backouts: [backout({ seats: 2, seats_before: 2 })],
        }),
      );
      expect(kinds(unfilled)).toEqual(['JOINED', 'BACKOUT_REQUESTED']);
    });

    // A partial backout means they are still going, with fewer seats.
    it('a partial backout keeps them going, so the attendance flow still runs', () => {
      const nodes = buildPodParticipationTimeline(
        input({
          podDateTime: PAST,
          attended: true,
          backouts: [backout({ status: 'SPOT_FILLED', seats: 1, seats_before: 3 })],
        }),
      );
      expect(kinds(nodes)).toEqual(['JOINED', 'BACKOUT_REQUESTED', 'DATE_ARRIVES', 'ATTENDED']);
    });

    it('a kept spot never ends the participation, even when it was for the whole booking', () => {
      const nodes = buildPodParticipationTimeline(
        input({
          podDateTime: PAST,
          attended: true,
          backouts: [backout({ status: 'CANCELLED', seats: 2, seats_before: 2 })],
        }),
      );
      expect(kinds(nodes)).toEqual(['JOINED', 'BACKOUT_REQUESTED', 'DATE_ARRIVES', 'ATTENDED']);
    });

    it('only the most recent request decides whether a seat remains', () => {
      const keptLast = buildPodParticipationTimeline(
        input({
          podDateTime: PAST,
          attended: true,
          backouts: [
            backout({ backout_no: 'DUN-BKO-0001', status: 'SPOT_FILLED', seats: 1, seats_before: 3 }),
            backout({ backout_no: 'DUN-BKO-0002', status: 'CANCELLED', seats: 2, seats_before: 2 }),
          ],
        }),
      );
      expect(kinds(keptLast)).toEqual([
        'JOINED',
        'BACKOUT_REQUESTED',
        'BACKOUT_REQUESTED',
        'DATE_ARRIVES',
        'ATTENDED',
      ]);

      const releasedLast = buildPodParticipationTimeline(
        input({
          podDateTime: PAST,
          attended: true,
          backouts: [
            backout({ backout_no: 'DUN-BKO-0001', status: 'CANCELLED', seats: 3, seats_before: 3 }),
            backout({ backout_no: 'DUN-BKO-0002', status: 'SPOT_FILLED', seats: 3, seats_before: 3 }),
          ],
        }),
      );
      expect(kinds(releasedLast)).toEqual(['JOINED', 'BACKOUT_REQUESTED', 'BACKOUT_REQUESTED']);
    });
  });

  describe('flow 4: the pod was cancelled', () => {
    const cancelled = (over: Partial<PodParticipationInput> = {}) =>
      input({ cancelledBy: 'HOST', cancelledAt: CANCELLED_AT, ...over });

    it('ends the story with POD_CANCELLED, CANCELLED_BY naming who did it, then the refund', () => {
      const nodes = buildPodParticipationTimeline(cancelled({ cancelRefundStatus: 'PROCESSED' }));
      expect(nodes).toEqual([
        { kind: 'JOINED', at: JOINED_AT, state: 'done' },
        {
          kind: 'POD_CANCELLED',
          at: CANCELLED_AT,
          state: 'done',
          children: [
            {
              kind: 'CANCELLED_BY',
              at: CANCELLED_AT,
              state: 'done',
              cancelledBy: 'HOST',
              children: [{ kind: 'REFUND_INITIATED', at: CANCELLED_AT, state: 'done' }],
            },
          ],
        },
      ]);
    });

    it('names whichever actor pulled the pod', () => {
      const actors: PodCancelActor[] = ['HOST', 'VENUE', 'CLUB_ADMIN', 'ADMIN', 'SYSTEM'];
      for (const actor of actors) {
        const nodes = buildPodParticipationTimeline(cancelled({ cancelledBy: actor }));
        expect(nodes[1].children?.[0].cancelledBy).toBe(actor);
      }
    });

    const cancelRefund = (status: PodParticipationInput['cancelRefundStatus']) =>
      buildPodParticipationTimeline(cancelled({ cancelRefundStatus: status }))[1].children?.[0]
        .children;

    it('a refund still with finance reads REFUND_PENDING', () => {
      expect(cancelRefund('PENDING')).toEqual([{ kind: 'REFUND_PENDING', state: 'current' }]);
    });

    // A club-admin delete moves no money and a free booking has none; an
    // unconditional "Refund Initiated" promised money to a card never used.
    it('a cancellation that moves no money says so rather than promising a refund', () => {
      expect(cancelRefund('NOT_ELIGIBLE')).toEqual([{ kind: 'REFUND_NOT_ELIGIBLE', state: 'done' }]);
    });

    it('shows no refund node at all when no refund is in play', () => {
      expect(cancelRefund('NONE')).toEqual([]);
      expect(cancelRefund(null)).toEqual([]);
      expect(cancelRefund(undefined)).toEqual([]);
    });

    it('never runs the attendance flow for a cancelled pod, even one whose date has passed', () => {
      const nodes = buildPodParticipationTimeline(
        cancelled({ podDateTime: PAST, attended: true, attendanceRecorded: true }),
      );
      expect(kinds(nodes)).toEqual(['JOINED', 'POD_CANCELLED']);
    });

    // An open DUN-BKO is still a live row in Finance when the host pulls the
    // pod; dropping it left the member with no id to quote. But a cancelled
    // pod cannot fill anybody's seat, so the open request reads as closed.
    it('keeps the own requests of the member before the cancellation, and closes the open one', () => {
      const nodes = buildPodParticipationTimeline(cancelled({ backouts: [backout()] }));
      expect(kinds(nodes)).toEqual(['JOINED', 'BACKOUT_REQUESTED', 'POD_CANCELLED']);
      expect(nodes[1].children).toEqual([
        {
          kind: 'SPOT_NOT_FILLED',
          state: 'done',
          backoutNo: 'DUN-BKO-0001',
          children: [{ kind: 'REFUND_NOT_ELIGIBLE', state: 'done', backoutNo: 'DUN-BKO-0001' }],
        },
      ]);
    });
  });
});

describe('podRefundState', () => {
  it('is NONE when nobody ever asked for a refund', () => {
    expect(podRefundState(input())).toBe('NONE');
    expect(podRefundState(input({ backouts: [] }))).toBe('NONE');
  });

  // The server never writes the booking's own refund_status for a partial
  // backout, so a member paid back for one of three seats was told their
  // refund had not started.
  it('reads the request rather than the booking: a processed partial outranks a stale NONE', () => {
    expect(
      podRefundState(
        input({
          refundStatus: 'NONE',
          backouts: [
            backout({ status: 'SPOT_FILLED', seats: 1, seats_before: 3, refund_status: 'PROCESSED' }),
          ],
        }),
      ),
    ).toBe('PROCESSED');
  });

  it('lets the strongest state across every request win: money that moved outranks money owed', () => {
    const states = (...refunds: PodBackoutRequestInput['refund_status'][]) =>
      podRefundState(
        input({
          backouts: refunds.map((refund_status, i) =>
            backout({ backout_no: `DUN-BKO-000${i}`, status: 'SPOT_FILLED', refund_status }),
          ),
        }),
      );
    expect(states('PENDING', 'PROCESSED', 'NOT_ELIGIBLE')).toBe('PROCESSED');
    expect(states('PROCESSED', 'PENDING')).toBe('PROCESSED');
    expect(states('NOT_ELIGIBLE', 'PENDING')).toBe('PENDING');
    expect(states('NOT_ELIGIBLE')).toBe('NOT_ELIGIBLE');
  });

  it('ignores a kept spot: nothing was released, so its refund row is noise', () => {
    expect(
      podRefundState(input({ backouts: [backout({ status: 'CANCELLED', refund_status: 'PENDING' })] })),
    ).toBe('NONE');
  });

  it('treats a request with no refund status as not started', () => {
    expect(podRefundState(input({ backouts: [backout({ status: 'SPOT_FILLED' })] }))).toBe('NONE');
    expect(
      podRefundState(input({ backouts: [backout({ status: 'SPOT_FILLED', refund_status: null })] })),
    ).toBe('NONE');
  });

  it('falls back to the cancellation refund and the booking status for rows from before requests existed', () => {
    expect(podRefundState(input({ cancelRefundStatus: 'PENDING' }))).toBe('PENDING');
    expect(podRefundState(input({ refundStatus: 'PROCESSED' }))).toBe('PROCESSED');
    expect(podRefundState(input({ cancelRefundStatus: null, refundStatus: null }))).toBe('NONE');
    // The ranking still applies across the two fallbacks.
    expect(
      podRefundState(input({ cancelRefundStatus: 'NOT_ELIGIBLE', refundStatus: 'PENDING' })),
    ).toBe('PENDING');
  });
});

describe('podParticipationActions', () => {
  it('allows a backout only while the pod is ahead and was not cancelled', () => {
    expect(podParticipationActions(input()).canBackout).toBe(true);
    expect(podParticipationActions(input({ podDateTime: PAST })).canBackout).toBe(false);
    expect(podParticipationActions(input({ cancelledBy: 'HOST' })).canBackout).toBe(false);
  });

  it('labels the booking Visited once the pod has happened and Joined while it is ahead', () => {
    expect(podParticipationActions(input({ podDateTime: PAST })).joinedLabelKind).toBe('VISITED');
    expect(podParticipationActions(input()).joinedLabelKind).toBe('JOINED');
  });

  // Nobody visited a pod that never happened, however old its date is.
  it('a cancelled pod was never visited, however old', () => {
    expect(
      podParticipationActions(input({ podDateTime: PAST, cancelledBy: 'VENUE' })).joinedLabelKind,
    ).toBe('JOINED');
  });

  it('still allows a backout on a pod with no date yet', () => {
    expect(podParticipationActions(input({ podDateTime: null })).canBackout).toBe(true);
  });

  // "Not started" is what most bookings say; it is not a state worth a control.
  it('shows a refund state only when one is in play, and takes the word from the request', () => {
    const quiet = podParticipationActions(input());
    expect(quiet.showRefundState).toBe(false);
    expect(quiet.refundStatus).toBe('NONE');

    const owed = podParticipationActions(
      input({
        refundStatus: 'NONE',
        backouts: [
          backout({ status: 'SPOT_FILLED', seats: 1, seats_before: 2, refund_status: 'PENDING' }),
        ],
      }),
    );
    expect(owed.showRefundState).toBe(true);
    expect(owed.refundStatus).toBe('PENDING');
  });

  it('adds the coins coming back across every release, because a booking can be given up in parts', () => {
    const { coinsRefunded } = podParticipationActions(
      input({
        backouts: [
          backout({
            backout_no: 'DUN-BKO-0001',
            status: 'SPOT_FILLED',
            seats: 1,
            seats_before: 3,
            coins_refunded: 30,
            refund_processed_at: PROCESSED_AT,
          }),
          backout({
            backout_no: 'DUN-BKO-0002',
            status: 'SPOT_FILLED',
            seats: 2,
            seats_before: 2,
            coins_refunded: 20,
          }),
        ],
      }),
    );
    expect(coinsRefunded).toBe(50);
  });

  // Anchored on one known figure so the odd rows are shown to add exactly
  // nothing — not merely that the total happens to be zero. A raw `Number()`
  // of any of them would poison the sum into NaN.
  it('treats a missing, null or non-numeric coin figure as zero, not as NaN', () => {
    const { coinsRefunded } = podParticipationActions(
      input({
        backouts: [
          backout({ backout_no: 'DUN-BKO-0001', status: 'SPOT_FILLED' }),
          backout({ backout_no: 'DUN-BKO-0002', status: 'SPOT_FILLED', coins_refunded: null }),
          backout({
            backout_no: 'DUN-BKO-0003',
            status: 'SPOT_FILLED',
            coins_refunded: 'lots' as unknown as number,
          }),
          backout({ backout_no: 'DUN-BKO-0004', status: 'SPOT_FILLED', coins_refunded: 0 }),
          backout({ backout_no: 'DUN-BKO-0005', status: 'SPOT_FILLED', coins_refunded: 5 }),
        ],
      }),
    );
    expect(coinsRefunded).toBe(5);
  });

  // Coins are whole, and a refund can never take coins away.
  it('floors a fractional coin figure and clamps a negative one to zero', () => {
    expect(
      podParticipationActions(
        input({ backouts: [backout({ status: 'SPOT_FILLED', coins_refunded: 12.9 })] }),
      ).coinsRefunded,
    ).toBe(12);
    expect(
      podParticipationActions(
        input({
          backouts: [
            backout({ backout_no: 'DUN-BKO-0001', status: 'SPOT_FILLED', coins_refunded: -5 }),
            backout({ backout_no: 'DUN-BKO-0002', status: 'SPOT_FILLED', coins_refunded: 7 }),
          ],
        }),
      ).coinsRefunded,
    ).toBe(7);
  });

  // The contract for the common case — a booking nobody has touched: the
  // whole object, so no field can quietly drift to a "refund" or a "visited".
  it('a pristine booking may back out, reports no refund and no coins, and reads Joined', () => {
    const pristine = {
      canBackout: true,
      showRefundState: false,
      coinsRefunded: 0,
      refundStatus: 'NONE',
      joinedLabelKind: 'JOINED',
    };
    expect(podParticipationActions(input())).toEqual(pristine);
    expect(podParticipationActions(input({ backouts: [] }))).toEqual(pristine);
  });

  it('reads the real clock when no now is injected', () => {
    const { now: _omitted, ...noClock } = input({ podDateTime: '2000-01-01T00:00:00.000Z' });
    const actions = podParticipationActions(noClock);
    expect(actions.canBackout).toBe(false);
    expect(actions.joinedLabelKind).toBe('VISITED');
  });
});

describe('backoutAttemptsLeft', () => {
  it('subtracts what the booking has already spent', () => {
    expect(backoutAttemptsLeft({ backout_attempts_max: 3, backout_attempts_used: 1 })).toBe(2);
    expect(backoutAttemptsLeft({ backout_attempts_max: 3, backout_attempts_used: 3 })).toBe(0);
  });

  it('never reads below zero, even when the server allowed more than the cap', () => {
    expect(backoutAttemptsLeft({ backout_attempts_max: 1, backout_attempts_used: 4 })).toBe(0);
  });

  it('is 0 for a booking whose attempt columns are missing or unanswered', () => {
    expect(backoutAttemptsLeft({})).toBe(0);
    expect(backoutAttemptsLeft({ backout_attempts_max: null, backout_attempts_used: null })).toBe(0);
    expect(backoutAttemptsLeft(null)).toBe(0);
    expect(backoutAttemptsLeft(undefined)).toBe(0);
    expect(backoutAttemptsLeft()).toBe(0);
  });

  it('counts an unused allowance in full', () => {
    expect(backoutAttemptsLeft({ backout_attempts_max: 2 })).toBe(2);
  });
});

describe('isBackoutMaxed', () => {
  it('is true only once the server has actually said the attempts are gone', () => {
    expect(isBackoutMaxed({ backout_attempts_max: 2, backout_attempts_used: 2 })).toBe(true);
  });

  it('is false while attempts remain', () => {
    expect(isBackoutMaxed({ backout_attempts_max: 2, backout_attempts_used: 1 })).toBe(false);
  });

  // Absent state means "not answered yet", not "none left" — treating a pending
  // query as exhausted greys the control out on every first paint.
  it('is false while the query has not answered', () => {
    expect(isBackoutMaxed(null)).toBe(false);
    expect(isBackoutMaxed(undefined)).toBe(false);
    expect(isBackoutMaxed()).toBe(false);
  });

  it('is true for a loaded booking that was never given an allowance', () => {
    expect(isBackoutMaxed({})).toBe(true);
  });
});

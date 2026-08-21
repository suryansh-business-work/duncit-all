/**
 * What happened to one person's place in one pod, as a timeline.
 *
 * Four flows, from the participation workflow the product is specified by:
 *
 *   1. Joined → the date arrives → Attended
 *   2. Joined → the date arrives → Not attended
 *   3. Joined → Backout requested → either the spot was filled (refund
 *      initiated) or it was not (refund not eligible)
 *   4. Joined → the pod was cancelled by somebody → refund initiated
 *
 * One builder rather than one per surface: mWeb, the native app and the
 * portals all have to agree about what a booking DID, and three readings of the
 * same rows is three chances to tell the same person three different stories.
 * It is pure — dates and rows in, nodes out — so it can be checked without a
 * browser, which is the only way a rule this branchy stays honest.
 */

/** Every node the timeline can render. The renderers switch on this, never on prose. */
export type PodTimelineKind =
  | 'JOINED'
  | 'DATE_ARRIVES'
  | 'ATTENDED'
  | 'NOT_ATTENDED'
  | 'ATTENDANCE_NOT_RECORDED'
  | 'BACKOUT_REQUESTED'
  | 'FINDING_REPLACEMENT'
  | 'SPOT_FILLED'
  | 'SPOT_NOT_FILLED'
  | 'KEPT_SPOT'
  | 'REFUND_INITIATED'
  | 'REFUND_NOT_ELIGIBLE'
  | 'REFUND_PENDING'
  | 'POD_CANCELLED'
  | 'CANCELLED_BY';

/** How far along a node is — the renderers colour from this, not from the kind. */
export type PodTimelineState = 'done' | 'current' | 'pending';

export interface PodTimelineNode {
  kind: PodTimelineKind;
  /** ISO timestamp when this happened, when one is known. */
  at?: string | null;
  state: PodTimelineState;
  /** The backout this node belongs to (DUN-BKO-…), for the ones that do. */
  backoutNo?: string;
  /** Seats released, when the node is about a partial backout. */
  seats?: number;
  /** Seats the booking held before that request — `seats < seatsBefore` is partial. */
  seatsBefore?: number;
  /** Who cancelled the pod, on CANCELLED_BY. */
  cancelledBy?: PodCancelActor;
  /** The branch under this node. Flows 3 and 4 are nested, not flat. */
  children?: PodTimelineNode[];
}

export type PodCancelActor = 'HOST' | 'VENUE' | 'CLUB_ADMIN' | 'ADMIN' | 'SYSTEM';

export type PodBackoutStatus = 'IN_PROCESS' | 'CANCELLED' | 'SPOT_FILLED';

/**
 * Where the money for one request stands.
 *
 * Per REQUEST, not per booking: a partial backout never touches the booking's
 * own refund_status, and a booking with three attempts has three answers. This
 * is the value Finance's User Backout Refunds row shows for the same DUN-BKO.
 */
export type PodRefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';

/** One backout request, as the server stores it (see BackoutRequestModel). */
export interface PodBackoutRequestInput {
  backout_no: string;
  status: PodBackoutStatus;
  attempt_no: number;
  seats: number;
  seats_before: number;
  refund_amount?: number | null;
  /** Duncit Coins this request gives back, after the Backouts deduction. The
   * coin half of refund_amount; 0 on a booking that spent no coins. */
  coins_refunded?: number | null;
  /** What Finance shows for this request. Absent on rows from before it existed. */
  refund_status?: PodRefundStatus | null;
  refund_processed_at?: string | null;
  created_at: string;
  events?: { status: PodBackoutStatus; at: string }[];
}

export interface PodParticipationInput {
  joinedAt: string;
  /** When the pod is scheduled. Null means a pod with no date yet. */
  podDateTime?: string | null;
  /** True once the host has scanned this booking in. */
  attended?: boolean;
  attendedAt?: string | null;
  /**
   * False when nobody took attendance at all — a virtual pod, or a host who
   * never opened the scanner. Saying "you did not attend" to someone who ran
   * the session is worse than saying nothing, so an unrecorded pod says so.
   */
  attendanceRecorded?: boolean;
  /** Set when the pod itself was cancelled, whoever did it. */
  cancelledBy?: PodCancelActor | null;
  cancelledAt?: string | null;
  /**
   * Where the money went when the pod was cancelled. Not every cancellation
   * refunds: a club-admin delete moves no money, and a free booking has none.
   */
  cancelRefundStatus?: PodRefundStatus | null;
  /** Refund state of the booking itself, for rows raised before requests existed. */
  refundStatus?: PodRefundStatus | null;
  /** Every backout this person raised on this pod, oldest first. */
  backouts?: PodBackoutRequestInput[];
  /** Now, injected so the result is deterministic to test. */
  now?: Date;
}

/**
 * The API's participation shape, as every surface receives it.
 *
 * PodMember carries these fields flat and PodParticipation carries them nested,
 * but the names are the same on both — so mWeb, native, Finance and Admin all
 * translate to the model here rather than each writing the same object literal
 * with one field spelled differently.
 */
export interface PodParticipationFields {
  joined_at?: string | null;
  attended?: boolean | null;
  attended_at?: string | null;
  attendance_recorded?: boolean | null;
  pod_cancelled_by?: PodCancelActor | null;
  pod_cancelled_at?: string | null;
  cancel_refund_status?: PodRefundStatus | null;
  refund_status?: PodRefundStatus | null;
  backouts?: PodBackoutRequestInput[] | null;
}

export function participationInputFrom(
  fields: PodParticipationFields | null | undefined,
  podDateTime?: string | null,
): PodParticipationInput {
  return {
    joinedAt: fields?.joined_at ?? '',
    podDateTime,
    attended: fields?.attended ?? false,
    attendedAt: fields?.attended_at,
    attendanceRecorded: fields?.attendance_recorded ?? false,
    cancelledBy: fields?.pod_cancelled_by ?? null,
    cancelledAt: fields?.pod_cancelled_at,
    cancelRefundStatus: fields?.cancel_refund_status ?? null,
    refundStatus: fields?.refund_status ?? null,
    backouts: fields?.backouts ?? [],
  };
}

/** True once the pod's own start time has passed. */
export function isPodPast(podDateTime?: string | null, now: Date = new Date()): boolean {
  if (!podDateTime) return false;
  const at = new Date(podDateTime).getTime();
  return Number.isFinite(at) && at < now.getTime();
}

/**
 * A backout that ended with the seat taken by somebody else.
 *
 * The refund follows the SEAT, not the request: a released seat nobody took is
 * the case the policy declines, and it is the only thing separating flow 3's
 * two branches.
 */
const isFilled = (request: PodBackoutRequestInput) => request.status === 'SPOT_FILLED';

/** The user changed their mind and kept the spot (the "Keep My Spot" path). */
const isKept = (request: PodBackoutRequestInput) => request.status === 'CANCELLED';

const eventAt = (request: PodBackoutRequestInput, status: PodBackoutStatus): string | null =>
  request.events?.find((event) => event.status === status)?.at ?? null;

/**
 * What one request's refund is doing, as a node.
 *
 * Read from the REQUEST's own status rather than from "has it been processed":
 * a booking with no payment behind it is never eligible, and telling that user
 * their refund is with the finance team is a promise nobody can keep — Finance
 * shows Not Eligible for the very same DUN-BKO id.
 */
function refundNode(request: PodBackoutRequestInput, filled: boolean): PodTimelineNode {
  const backoutNo = request.backout_no;
  // Rows from before the per-request status existed are derived the same way
  // the server derives it: processed wins, then a filled seat is owed, and a
  // seat nobody took is the case the policy declines.
  let fallback: PodRefundStatus = 'NOT_ELIGIBLE';
  if (request.refund_processed_at) fallback = 'PROCESSED';
  else if (filled) fallback = 'PENDING';
  const status = request.refund_status ?? fallback;

  if (status === 'PROCESSED') {
    return { kind: 'REFUND_INITIATED', at: request.refund_processed_at, state: 'done', backoutNo };
  }
  if (status === 'PENDING') {
    return { kind: 'REFUND_PENDING', state: 'current', backoutNo };
  }
  return { kind: 'REFUND_NOT_ELIGIBLE', state: 'done', backoutNo };
}

/**
 * The branch under one backout request.
 *
 * Kept spots end there — nothing was released, so nothing is owed. A filled
 * spot leads to the refund. A request still IN_PROCESS has NOT failed: the
 * seat is on sale and somebody may still take it, so it says so rather than
 * announcing an outcome that has not happened. Only once the pod is past does
 * an unfilled seat become the case the policy declines.
 */
function backoutBranch(
  request: PodBackoutRequestInput,
  podPast: boolean
): PodTimelineNode[] {
  if (isKept(request)) {
    return [
      {
        kind: 'KEPT_SPOT',
        at: eventAt(request, 'CANCELLED'),
        state: 'done',
        backoutNo: request.backout_no,
      },
    ];
  }

  if (isFilled(request)) {
    return [
      {
        kind: 'SPOT_FILLED',
        at: eventAt(request, 'SPOT_FILLED'),
        state: 'done',
        backoutNo: request.backout_no,
        children: [refundNode(request, true)],
      },
    ];
  }

  if (!podPast) {
    return [
      {
        kind: 'FINDING_REPLACEMENT',
        state: 'current',
        backoutNo: request.backout_no,
      },
    ];
  }

  // The pod happened and nobody took the seat — the one case the policy declines.
  return [
    {
      kind: 'SPOT_NOT_FILLED',
      state: 'done',
      backoutNo: request.backout_no,
      children: [refundNode(request, false)],
    },
  ];
}

/**
 * What the cancellation did to the money.
 *
 * Not every cancellation refunds. A club-admin delete moves nothing, and a free
 * booking has nothing to move — so an unconditional "Refund Initiated" told
 * those people money was on its way back to a card they never used.
 */
function cancellationRefund(status: PodRefundStatus | null | undefined, at?: string | null) {
  if (status === 'PROCESSED') {
    return [{ kind: 'REFUND_INITIATED' as const, at, state: 'done' as const }];
  }
  if (status === 'PENDING') {
    return [{ kind: 'REFUND_PENDING' as const, state: 'current' as const }];
  }
  if (status === 'NOT_ELIGIBLE') {
    return [{ kind: 'REFUND_NOT_ELIGIBLE' as const, state: 'done' as const }];
  }
  return [];
}

/**
 * How the pod ended, once the person's own requests have been drawn.
 *
 * The cancellation is the LAST thing that happened, not the only thing: an open
 * DUN-BKO request is still a live row in Finance when the host pulls the pod,
 * and dropping it left the member with no id to quote and support with nothing
 * to match.
 */
function attendanceNodes(input: PodParticipationInput): PodTimelineNode[] {
  const arrives: PodTimelineNode = { kind: 'DATE_ARRIVES', at: input.podDateTime, state: 'done' };
  if (input.attended) {
    return [
      arrives,
      { kind: 'ATTENDED', at: input.attendedAt ?? input.podDateTime, state: 'done' },
    ];
  }
  // Nobody scanned anyone — a virtual pod, or a host who never opened the
  // scanner. "You did not attend" would be a claim the system cannot make.
  if (!input.attendanceRecorded) {
    return [arrives, { kind: 'ATTENDANCE_NOT_RECORDED', at: input.podDateTime, state: 'done' }];
  }
  return [arrives, { kind: 'NOT_ATTENDED', at: input.podDateTime, state: 'done' }];
}

/**
 * The whole timeline for one booking.
 *
 * Every backout they raised is its own branch — a pod allows several attempts,
 * and each one is a separate row in Finance with its own id. The attendance
 * flow still runs when the backout was partial, because a partial backout means
 * they are still going, with fewer seats. A cancelled pod ends the story after
 * those branches rather than instead of them.
 */
export function buildPodParticipationTimeline(
  input: PodParticipationInput
): PodTimelineNode[] {
  const now = input.now ?? new Date();
  const podPast = isPodPast(input.podDateTime, now);
  const backouts = input.backouts ?? [];

  const nodes: PodTimelineNode[] = [
    { kind: 'JOINED', at: input.joinedAt, state: 'done' },
  ];

  for (const request of backouts) {
    nodes.push({
      kind: 'BACKOUT_REQUESTED',
      at: request.created_at,
      state: 'done',
      backoutNo: request.backout_no,
      seats: request.seats,
      seatsBefore: request.seats_before,
      // A cancelled pod cannot fill anybody's seat any more, so an open request
      // reads as closed rather than as still being worked on.
      children: backoutBranch(request, podPast || Boolean(input.cancelledBy)),
    });
  }

  if (input.cancelledBy) {
    nodes.push({
      kind: 'POD_CANCELLED',
      at: input.cancelledAt,
      state: 'done',
      children: [
        {
          kind: 'CANCELLED_BY',
          at: input.cancelledAt,
          state: 'done',
          cancelledBy: input.cancelledBy,
          children: cancellationRefund(input.cancelRefundStatus, input.cancelledAt),
        },
      ],
    });
    return nodes;
  }

  /*
    Do they still have a seat?

    A full backout that was filled ends their participation, so the attendance
    flow would be a lie. A PARTIAL one does not: they gave back some seats and
    are still going with the rest. The most recent request is the one that says
    where they stand.
  */
  const last = backouts.length > 0 ? backouts[backouts.length - 1] : undefined;
  const gaveUpEverything =
    !!last && !isKept(last) && last.seats >= last.seats_before;
  if (gaveUpEverything) return nodes;

  if (!podPast) return nodes;

  nodes.push(...attendanceNodes(input));
  return nodes;
}

const REFUND_RANK: Record<PodRefundStatus, number> = {
  NONE: 0,
  NOT_ELIGIBLE: 1,
  PENDING: 2,
  PROCESSED: 3,
};

/**
 * The one refund this booking has to report.
 *
 * Per request, because the booking's own refund_status is not the truth: the
 * server never writes it for a partial backout, so a member who was paid back
 * for one of three seats was being told their refund had not started. The
 * strongest state across the requests wins — money that moved outranks money
 * that is owed — and the booking's own status is only the fallback for rows
 * raised before requests were recorded.
 */
export function podRefundState(input: PodParticipationInput): PodRefundStatus {
  const fromRequests = (input.backouts ?? [])
    .filter((request) => request.status !== 'CANCELLED')
    .map((request) => request.refund_status ?? 'NONE');
  const candidates: PodRefundStatus[] = [
    ...fromRequests,
    input.cancelRefundStatus ?? 'NONE',
    input.refundStatus ?? 'NONE',
  ];
  return candidates.reduce<PodRefundStatus>(
    (best, next) => (REFUND_RANK[next] > REFUND_RANK[best] ? next : best),
    'NONE'
  );
}

/**
 * Whether the booking may still be backed out of, what its refund actually is,
 * and what the screen may call it.
 *
 * All three are here rather than in each surface because they are the same
 * question asked three ways: a pod that has already happened has nothing left
 * to back out of, a booking with no refund in play has no refund to report, and
 * a cancelled pod was never visited by anybody.
 */
export function podParticipationActions(input: PodParticipationInput): {
  canBackout: boolean;
  showRefundState: boolean;
  /** Coins coming back across EVERY release on this booking. A booking can be
   * given up in parts, so one number per request would under-report it. */
  coinsRefunded: number;
  /** What to show when a refund IS in play — never the booking's stale copy. */
  refundStatus: PodRefundStatus;
  /** "Visited" once the pod has happened; "Joined" while it is still ahead. */
  joinedLabelKind: 'JOINED' | 'VISITED';
} {
  const now = input.now ?? new Date();
  const podPast = isPodPast(input.podDateTime, now);
  const cancelled = Boolean(input.cancelledBy);
  const refundStatus = podRefundState(input);
  const coinsRefunded = (input.backouts ?? []).reduce(
    (sum, request) => sum + Math.max(0, Math.floor(Number(request.coins_refunded) || 0)),
    0,
  );
  return {
    canBackout: !podPast && !cancelled,
    coinsRefunded,
    // "Not started" is not a refund state worth a control: it is what a booking
    // says when nobody ever asked for one, which is most of them.
    showRefundState: refundStatus !== 'NONE',
    refundStatus,
    joinedLabelKind: podPast && !cancelled ? 'VISITED' : 'JOINED',
  };
}

/**
 * The membership-state fields that say how many times this booking may still be
 * given up. Named separately because four screens read them and none of them
 * needs the rest of PodMembershipState.
 */
export interface PodBackoutAttempts {
  backout_attempts_used?: number | null;
  backout_attempts_max?: number | null;
}

/**
 * Backout attempts this booking has left.
 *
 * The same subtraction Pod Details and Pod History both need, and the same one
 * the server's own guard refuses on — a screen that works it out for itself is
 * a screen that can offer a button every press of which fails.
 */
export function backoutAttemptsLeft(state?: PodBackoutAttempts | null): number {
  return Math.max(0, (state?.backout_attempts_max ?? 0) - (state?.backout_attempts_used ?? 0));
}

/**
 * True only once the server has ACTUALLY said the attempts are gone.
 *
 * Absent state means "not answered yet", not "none left": treating a pending
 * query as exhausted greys the control out on every first paint.
 */
export function isBackoutMaxed(state?: PodBackoutAttempts | null): boolean {
  return !!state && backoutAttemptsLeft(state) === 0;
}

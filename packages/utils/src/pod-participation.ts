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
  | 'BACKOUT_REQUESTED'
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

/** One backout request, as the server stores it (see BackoutRequestModel). */
export interface PodBackoutRequestInput {
  backout_no: string;
  status: PodBackoutStatus;
  attempt_no: number;
  seats: number;
  seats_before: number;
  refund_amount?: number | null;
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
  /** Set when the pod itself was cancelled, whoever did it. */
  cancelledBy?: PodCancelActor | null;
  cancelledAt?: string | null;
  /** Every backout this person raised on this pod, oldest first. */
  backouts?: PodBackoutRequestInput[];
  /** Now, injected so the result is deterministic to test. */
  now?: Date;
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
 * The branch under one backout request.
 *
 * Kept spots end there — nothing was released, so nothing is owed. A filled
 * spot leads to the refund, which is only INITIATED once Finance has processed
 * it; before that it is pending, and saying "initiated" early is a promise the
 * ledger has not made. An unfilled spot is only "not eligible" once the pod has
 * happened: until then it can still be filled.
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
    const processed = Boolean(request.refund_processed_at);
    return [
      {
        kind: 'SPOT_FILLED',
        at: eventAt(request, 'SPOT_FILLED'),
        state: 'done',
        backoutNo: request.backout_no,
        children: [
          processed
            ? {
                kind: 'REFUND_INITIATED',
                at: request.refund_processed_at,
                state: 'done',
                backoutNo: request.backout_no,
              }
            : { kind: 'REFUND_PENDING', state: 'current', backoutNo: request.backout_no },
        ],
      },
    ];
  }

  // Still in process: the seat is out there waiting for somebody.
  return [
    {
      kind: 'SPOT_NOT_FILLED',
      state: podPast ? 'done' : 'current',
      backoutNo: request.backout_no,
      children: podPast
        ? [{ kind: 'REFUND_NOT_ELIGIBLE', state: 'done', backoutNo: request.backout_no }]
        : [],
    },
  ];
}

/**
 * The whole timeline for one booking.
 *
 * Cancellation wins over everything: once the pod is gone, what the person did
 * about their own seat stopped mattering. Otherwise every backout they raised
 * is its own branch — a pod allows several attempts, and each one is a separate
 * row in Finance with its own id — and the attendance flow still runs when the
 * backout was partial, because a partial backout means they are still going,
 * with fewer seats.
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
          children: [{ kind: 'REFUND_INITIATED', at: input.cancelledAt, state: 'done' }],
        },
      ],
    });
    return nodes;
  }

  for (const request of backouts) {
    nodes.push({
      kind: 'BACKOUT_REQUESTED',
      at: request.created_at,
      state: 'done',
      backoutNo: request.backout_no,
      seats: request.seats,
      seatsBefore: request.seats_before,
      children: backoutBranch(request, podPast),
    });
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

  nodes.push(
    { kind: 'DATE_ARRIVES', at: input.podDateTime, state: 'done' },
    input.attended
      ? { kind: 'ATTENDED', at: input.attendedAt ?? input.podDateTime, state: 'done' }
      : { kind: 'NOT_ATTENDED', at: input.podDateTime, state: 'done' }
  );
  return nodes;
}

/**
 * Whether the booking may still be backed out of, and whether a refund state is
 * worth showing at all.
 *
 * Both answers are here rather than in each surface because they are the same
 * question asked twice: a pod that has already happened has nothing left to
 * back out of, and a booking nobody asked a refund for has no refund to report.
 */
export function podParticipationActions(input: PodParticipationInput): {
  canBackout: boolean;
  showRefundState: boolean;
  /** "Visited" once the pod has happened; "Joined" while it is still ahead. */
  joinedLabelKind: 'JOINED' | 'VISITED';
} {
  const now = input.now ?? new Date();
  const podPast = isPodPast(input.podDateTime, now);
  const backouts = input.backouts ?? [];
  return {
    canBackout: !podPast && !input.cancelledBy,
    showRefundState: backouts.length > 0 || Boolean(input.cancelledBy),
    joinedLabelKind: podPast ? 'VISITED' : 'JOINED',
  };
}

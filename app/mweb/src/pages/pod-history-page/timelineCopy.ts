import type { PodCancelActor, PodTimelineKind, PodTimelineNode } from '@duncit/utils';

/**
 * What each state of the participation workflow says on screen.
 *
 * Kept apart from the drawing so the native twin can render the same nodes with
 * the same words: the timeline is one model (rule 27), and two hand-written
 * copies of this table is exactly how the two apps start describing the same
 * booking differently.
 */
export interface TimelineCopy {
  title: string;
  detail: string;
  /** Drives the icon and the colour — the renderer never reads the kind. */
  tone: 'good' | 'bad' | 'warn' | 'info';
}

const ACTOR: Record<PodCancelActor, string> = {
  HOST: 'the host',
  VENUE: 'the venue',
  CLUB_ADMIN: 'the club admin',
  ADMIN: 'Duncit',
  SYSTEM: 'the system',
};

const BASE: Record<PodTimelineKind, TimelineCopy> = {
  JOINED: {
    title: 'Pod Joined',
    detail: 'You have successfully joined the pod.',
    tone: 'good',
  },
  DATE_ARRIVES: {
    title: 'Pod Date Arrives',
    detail: 'The pod is happening as scheduled.',
    tone: 'info',
  },
  ATTENDED: {
    title: 'Pod Attended',
    detail: 'You attended the pod. Experience recorded.',
    tone: 'good',
  },
  NOT_ATTENDED: {
    title: 'Pod Not Attended',
    detail: 'You did not attend the pod.',
    tone: 'bad',
  },
  BACKOUT_REQUESTED: {
    title: 'Pod Backout Requested',
    detail: 'You have requested to back out from the pod.',
    tone: 'warn',
  },
  SPOT_FILLED: {
    title: 'Spot Filled',
    detail: 'Your spot was filled by someone else.',
    tone: 'good',
  },
  SPOT_NOT_FILLED: {
    title: 'Spot Not Filled',
    detail: 'Your spot could not be filled by anyone.',
    tone: 'warn',
  },
  KEPT_SPOT: {
    title: 'Spot Kept',
    detail: 'You reserved your spot back and stayed in the pod.',
    tone: 'good',
  },
  REFUND_INITIATED: {
    title: 'Refund Initiated',
    detail: 'Refund has been initiated to your original payment method.',
    tone: 'good',
  },
  REFUND_PENDING: {
    title: 'Refund Being Processed',
    detail: 'Your refund is with our finance team and has not left yet.',
    tone: 'info',
  },
  REFUND_NOT_ELIGIBLE: {
    title: 'Refund Not Eligible',
    detail: 'Refund is not eligible as per policy.',
    tone: 'bad',
  },
  POD_CANCELLED: {
    title: 'Pod Cancelled',
    detail: 'The pod has been cancelled.',
    tone: 'bad',
  },
  CANCELLED_BY: {
    title: 'Cancelled By',
    detail: 'The pod was cancelled.',
    tone: 'bad',
  },
};

/**
 * The words for one node, with the parts only that node knows filled in.
 *
 * A partial backout has to say so where it happened. "You backed out" is a lie
 * when somebody gave up one seat of four and is still going, and that sentence
 * is the only place on the screen where the difference is visible.
 */
export function timelineCopy(node: PodTimelineNode): TimelineCopy {
  const base = BASE[node.kind];

  if (node.kind === 'CANCELLED_BY' && node.cancelledBy) {
    return { ...base, detail: `The pod was cancelled by ${ACTOR[node.cancelledBy]}.` };
  }

  if (node.kind === 'BACKOUT_REQUESTED') {
    const seats = node.seats ?? 0;
    const before = node.seatsBefore ?? 0;
    const partial = seats > 0 && before > seats;
    if (partial) {
      const kept = before - seats;
      return {
        ...base,
        title: 'Partial Backout Requested',
        detail: `You released ${seats} of ${before} seats and kept ${kept}.`,
      };
    }
  }

  return base;
}

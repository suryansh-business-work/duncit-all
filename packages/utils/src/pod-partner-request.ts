/**
 * Pod Requests between venues and hosts — the rules every surface reads the
 * same way (Partners console, mWeb, native; rules 27 + 40). The server owns the
 * state machine; this is only "what can I do now" and "which list is it in".
 *
 * The side that RECEIVES a request accepts it and picks the slot; the side
 * that SENT it confirms the slot; the host creates the pod.
 */

export type PodRequestDirection = 'VENUE_TO_HOST' | 'HOST_TO_VENUE';
export type PodRequestSide = 'HOST' | 'VENUE';
export type PodRequestStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'SLOT_REQUESTED'
  | 'SLOT_CONFIRMED'
  | 'POD_CREATED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PodRequestLike {
  direction: PodRequestDirection | `${PodRequestDirection}`;
  status: PodRequestStatus | `${PodRequestStatus}`;
  viewer_side: PodRequestSide | `${PodRequestSide}`;
}

/** What the viewer's side can do with a request right now. */
export type PodRequestAction =
  | 'RESPOND'
  | 'WITHDRAW'
  | 'PICK_SLOT'
  | 'WAIT_SLOT'
  | 'CONFIRM_SLOT'
  | 'WAIT_CONFIRM'
  | 'CREATE_POD'
  | 'HOST_CREATES'
  | 'DONE'
  | 'CLOSED';

/** The nearby searches: 5 km to start, never past 10. */
export const POD_REQUEST_DEFAULT_RADIUS_KM = 5;
export const POD_REQUEST_MAX_RADIUS_KM = 10;

export const podRequestSender = (direction: PodRequestLike['direction']): PodRequestSide =>
  direction === 'VENUE_TO_HOST' ? 'VENUE' : 'HOST';

/** True when the viewer's side sent the request. */
export const sentByViewer = (req: PodRequestLike): boolean => podRequestSender(req.direction) === req.viewer_side;

export function podRequestNextAction(req: PodRequestLike): PodRequestAction {
  const sender = sentByViewer(req);
  switch (req.status) {
    case 'REQUESTED':
      return sender ? 'WITHDRAW' : 'RESPOND';
    case 'ACCEPTED':
      return sender ? 'WAIT_SLOT' : 'PICK_SLOT';
    case 'SLOT_REQUESTED':
      return sender ? 'CONFIRM_SLOT' : 'WAIT_CONFIRM';
    case 'SLOT_CONFIRMED':
      return req.viewer_side === 'HOST' ? 'CREATE_POD' : 'HOST_CREATES';
    case 'POD_CREATED':
      return 'DONE';
    default:
      return 'CLOSED';
  }
}

const IN_PROGRESS = new Set<string>(['ACCEPTED', 'SLOT_REQUESTED', 'SLOT_CONFIRMED', 'POD_CREATED']);

/**
 * A studio's lists: Requests (received, unanswered), the Accepted tab
 * (received and accepted, through to the pod), and what this side sent.
 * Declined / withdrawn / expired received requests drop out of both tabs.
 */
export function splitPodRequests<T extends PodRequestLike>(requests: readonly T[]) {
  const incoming: T[] = [];
  const accepted: T[] = [];
  const sent: T[] = [];
  for (const req of requests) {
    if (sentByViewer(req)) sent.push(req);
    else if (req.status === 'REQUESTED') incoming.push(req);
    else if (IN_PROGRESS.has(req.status)) accepted.push(req);
  }
  return { incoming, accepted, sent };
}

type Translate = (key: string) => string;

/** The status chip's words — each key written out, so the translation gate can see it. */
export function podRequestStatusLabel(status: PodRequestLike['status'], t: Translate): string {
  switch (status) {
    case 'REQUESTED':
      return t('podRequests.statusRequested');
    case 'ACCEPTED':
      return t('podRequests.statusAccepted');
    case 'SLOT_REQUESTED':
      return t('podRequests.statusSlotRequested');
    case 'SLOT_CONFIRMED':
      return t('podRequests.statusSlotConfirmed');
    case 'POD_CREATED':
      return t('podRequests.statusPodCreated');
    case 'REJECTED':
      return t('podRequests.statusRejected');
    case 'CANCELLED':
      return t('podRequests.statusCancelled');
    default:
      return t('podRequests.statusExpired');
  }
}

/** The chip's tone: live work, done, or over. */
export function podRequestStatusTone(status: PodRequestLike['status']): 'warning' | 'success' | 'neutral' {
  if (status === 'POD_CREATED' || status === 'SLOT_CONFIRMED') return 'success';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED') return 'neutral';
  return 'warning';
}

/** Clamps a radius into the search's 0–10 km range (default 5 for anything unusable). */
export function clampPodRequestRadius(km: unknown): number {
  const n = typeof km === 'number' ? km : Number(km);
  if (!Number.isFinite(n)) return POD_REQUEST_DEFAULT_RADIUS_KM;
  return Math.min(POD_REQUEST_MAX_RADIUS_KM, Math.max(0, n));
}

/** The "search wider" offer on an empty result: the full 10 km, or null when already there. */
export function widerPodRequestRadius(km: number): number | null {
  return km < POD_REQUEST_MAX_RADIUS_KM ? POD_REQUEST_MAX_RADIUS_KM : null;
}

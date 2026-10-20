/**
 * Free pods — the venue's money is settled OFF the platform.
 *
 * A FREE pod collects nothing, so Duncit has nothing to pay a venue from: the
 * host settles the venue's charges with the venue directly. Create Pod says so
 * on mWeb and in the native app, on the venue step and again before publishing,
 * and both must decide WHEN to say it from the same rule (rules 29 + 56) —
 * each surface only words and draws the note.
 */

/** What Create Pod tells the host of a free pod about the venue's charges. */
export type FreePodVenueNotice =
  /** Nothing to settle: a paid pod, no slot picked, an unpriced slot or the host's own venue. */
  | 'NONE'
  /** The venue is owed: bookings are instant, so the host settles with the venue directly. */
  | 'SETTLE';

export interface FreePodVenueInput {
  /** The pod's type as the form holds it — only `'FREE'` is free. */
  podType?: string | null;
  /** Price of the picked venue slot; null/undefined while none is picked. */
  slotPrice?: number | null;
  /** The host owns the venue — it costs them nothing. */
  ownVenue?: boolean;
}

/** The only free pod type — the model virtual free pods already use. */
export const isFreePod = (podType?: string | null): boolean => podType === 'FREE';

/**
 * Whether — and how — a free pod's host must be told to settle with the venue.
 *
 * Only a FREE pod on a slot that costs something at somebody else's venue owes
 * anything; a slot priced 0 and the host's own venue book instantly, as they do
 * for a paid pod, and carry no note.
 */
export function freePodVenueNotice(input: Readonly<FreePodVenueInput>): FreePodVenueNotice {
  if (!isFreePod(input.podType) || input.ownVenue) return 'NONE';
  const slotPrice = Number(input.slotPrice);
  if (Number.isNaN(slotPrice) || slotPrice <= 0) return 'NONE';
  return 'SETTLE';
}

/**
 * The sentence for each reason "Cancel the spot" can be refused, by the
 * GraphQL error code `cancelFreeSpot` answers with. mWeb and the app share the
 * `mweb.*` bundle, so both say the same thing about the same refusal.
 */
const CANCEL_SPOT_ERROR_KEYS: Record<string, string> = {
  ALREADY_CHECKED_IN: 'mweb.podDetails.cancelSpotCheckedIn',
  BAD_REQUEST: 'mweb.podDetails.cancelSpotStarted',
  NOT_FOUND: 'mweb.podDetails.cancelSpotNotMember',
  CANCEL_LIMIT_REACHED: 'mweb.podDetails.cancelSpotLimitReached',
};

/** The generic sentence — a network failure, or a code this flow does not know. */
export const CANCEL_SPOT_GENERIC_ERROR_KEY = 'mweb.podDetails.cancelSpotFailed';

/** The translation key for a refused cancel, from its `extensions.code`. */
export function cancelSpotErrorKey(code: string | null | undefined): string {
  return CANCEL_SPOT_ERROR_KEYS[code ?? ''] ?? CANCEL_SPOT_GENERIC_ERROR_KEY;
}

/**
 * The membership-state fields that say how many times a FREE pod's spot may
 * still be cancelled (Admin > Pods > Pod Settings caps it per member per pod).
 */
export interface FreeSpotCancels {
  spot_cancels_used?: number | null;
  spot_cancels_max?: number | null;
}

/**
 * Spot cancellations this member has left on this free pod — the same
 * subtraction the server's `cancelFreeSpot` refuses on. Null while the state
 * has not been answered, and on a paid pod (max 0), where there is no
 * Cancel Spot to count.
 */
export function freeSpotCancelsLeft(state?: FreeSpotCancels | null): number | null {
  const max = state?.spot_cancels_max ?? 0;
  if (!state || max <= 0) return null;
  return Math.max(0, max - (state.spot_cancels_used ?? 0));
}

/** True only once the server has said every cancellation is used up. */
export function isFreeSpotCancelMaxed(state?: FreeSpotCancels | null): boolean {
  return freeSpotCancelsLeft(state) === 0;
}

/** One line of copy: a literal key and, when it needs one, its variables. */
export interface FreeSpotCancelHint {
  key: string;
  vars?: Record<string, number>;
}

/**
 * What the free pod's Cancel Spot UI says about the cap — under the booked
 * state and inside the confirm dialog, on mWeb and in the app alike. Every key
 * is written out here once (the translation gate greps for literals).
 */
export function freeSpotCancelHint(state?: FreeSpotCancels | null): FreeSpotCancelHint | null {
  const left = freeSpotCancelsLeft(state);
  if (left === null) return null;
  if (left === 0) return { key: 'mweb.podDetails.cancelSpotLimitReached' };
  if (left === 1) return { key: 'mweb.podDetails.cancelSpotLastOne' };
  return { key: 'mweb.podDetails.cancelSpotRemaining', vars: { left } };
}

export interface MemberBookedInput {
  isFree: boolean;
  isExpired: boolean;
  canBackout: boolean;
  canCancelSpot: boolean;
  spotCancels?: FreeSpotCancels | null;
}

/** The booked member's panel copy, decided once for mWeb's MemberPanel and the app's MemberBookedBar. */
export interface MemberBookedCopy {
  /** Why leaving is closed, or how many free cancellations are left — null when there is nothing to say. */
  note: FreeSpotCancelHint | null;
  overlineKey: string;
  badgeKey: string;
}

/**
 * A free pod's spot stops being cancellable before the date for one of two
 * reasons — a check-in at the door, or every cancellation used up — and while
 * it still can be, the note says how many cancellations are left. A paid pod's
 * only block is the backout cap.
 */
export function memberBookedCopy(input: Readonly<MemberBookedInput>): MemberBookedCopy {
  const { isFree, isExpired, canBackout, canCancelSpot, spotCancels } = input;
  const cancelHint = isFree ? freeSpotCancelHint(spotCancels) : null;
  const canLeave = isFree ? canCancelSpot : canBackout;
  let note: FreeSpotCancelHint | null = cancelHint;
  if (!canLeave) note = { key: blockedNoteKey(isFree, isExpired, cancelHint) };
  return {
    note,
    overlineKey: isExpired ? 'mweb.podDetails.youWent' : 'mweb.podDetails.youreGoing',
    badgeKey: isExpired ? 'mweb.podDetails.podVisited' : 'mweb.podDetails.podBooked',
  };
}

function blockedNoteKey(isFree: boolean, isExpired: boolean, cancelHint: FreeSpotCancelHint | null): string {
  if (isExpired) return 'mweb.podDetails.alreadyTakenPlace';
  if (!isFree) return 'mweb.podDetails.backoutMaxed';
  return cancelHint?.key === 'mweb.podDetails.cancelSpotLimitReached'
    ? 'mweb.podDetails.cancelSpotLimitReached'
    : 'mweb.podDetails.cancelSpotCheckedIn';
}

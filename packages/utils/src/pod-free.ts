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
  /** The venue is owed and has already confirmed the slot (a Pod Request's slot). */
  | 'SETTLE'
  /** The venue is owed and will hold its approval until the host has settled. */
  | 'SETTLE_BEFORE_APPROVAL';

export interface FreePodVenueInput {
  /** The pod's type as the form holds it — only `'FREE'` is free. */
  podType?: string | null;
  /** Price of the picked venue slot; null/undefined while none is picked. */
  slotPrice?: number | null;
  /** The host owns the venue — its slots book instantly and cost them nothing. */
  ownVenue?: boolean;
  /** The slot comes from a confirmed Pod Request, so no second approval follows. */
  slotConfirmed?: boolean;
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
  if (!(Number(input.slotPrice) > 0)) return 'NONE';
  return input.slotConfirmed ? 'SETTLE' : 'SETTLE_BEFORE_APPROVAL';
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
  NOT_FREE_POD: 'mweb.podDetails.cancelSpotPaidPod',
};

/** The generic sentence — a network failure, or a code this flow does not know. */
export const CANCEL_SPOT_GENERIC_ERROR_KEY = 'mweb.podDetails.cancelSpotFailed';

/** The translation key for a refused cancel, from its `extensions.code`. */
export function cancelSpotErrorKey(code: string | null | undefined): string {
  return CANCEL_SPOT_ERROR_KEYS[code ?? ''] ?? CANCEL_SPOT_GENERIC_ERROR_KEY;
}

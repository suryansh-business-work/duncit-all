/**
 * The venue's side of the finance-negative pod auto-cancel, as
 * `Venue.settings.cancellation` answers it and `setVenueCancellationTrigger`
 * takes it back.
 */

/** One refund band as the server holds it: a pod cancelled with MORE than
 * `hours_before` hours still to run refunds `refund_pct` of the ticket money. */
export interface VenueRefundTier {
  hours_before: number;
  refund_pct: number;
}

export interface VenueCancellationTrigger {
  trigger_hours: number;
  refund_tiers: VenueRefundTier[];
}

/**
 * One band as the form edits it. Both numbers are held as strings because they
 * come out of text inputs — an emptied number field yields `''`, and form state
 * that coerced that to 0 on every keystroke would keep rewriting what the
 * reviewer is typing.
 */
export interface RefundTierValues {
  hours_before: string;
  refund_pct: string;
}

export interface CancellationTriggerValues {
  trigger_hours: string;
  refund_tiers: RefundTierValues[];
}

/** What the review saves: the trigger, and the ladder behind it. */
export type SubmitCancellationTrigger = (values: VenueCancellationTrigger) => Promise<void>;

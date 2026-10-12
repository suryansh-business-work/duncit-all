import type { VenueBillTerms } from '@duncit/utils';
import type { PaymentReleaseRow } from '../queries';

/** Everything the request page derives from the payouts on it. */
export interface ReleaseRequestView {
  /** The venue bill + attendance figures, or null on a request with no v2 snapshot. */
  terms: VenueBillTerms | null;
  /** False on a pod with no venue payout — only the attendance line applies. */
  hasVenue: boolean;
  billUrl: string;
  media: { url: string; type: string }[];
  notes: string[];
  pending: PaymentReleaseRow[];
  pendingTotal: number;
}

/**
 * Reads one request's shared facts off its payouts.
 *
 * Every payout a completion creates carries the same frozen attendance and
 * venue terms, so any of them answers; the venue's own release is preferred
 * because its `share_amount` IS the venue total. Nothing is computed here —
 * the figures are the settlement snapshot's.
 */
export function buildReleaseRequestView(releases: readonly PaymentReleaseRow[]): ReleaseRequestView {
  const venue = releases.find((r) => r.kind === 'VENUE_BILLING' && r.breakdown);
  const snapshot = (venue ?? releases.find((r) => r.breakdown))?.breakdown;
  const terms: VenueBillTerms | null =
    snapshot && snapshot.version >= 2
      ? {
          slot_price: snapshot.venue_slot_price,
          bill: snapshot.venue_bill,
          slot_included: snapshot.include_slot_price,
          venue_amount: venue?.breakdown?.share_amount ?? 0,
          attended_seats: snapshot.attended_seats,
          booked_seats: snapshot.booked_seats,
        }
      : null;

  const media = new Map<string, { url: string; type: string }>();
  for (const release of releases) {
    for (const item of release.evidence_media ?? []) media.set(item.url, item);
  }
  const pending = releases.filter((r) => r.status === 'PENDING');

  return {
    terms,
    hasVenue: !!venue,
    billUrl: releases.find((r) => r.bill_url)?.bill_url ?? '',
    media: [...media.values()],
    notes: [...new Set(releases.map((r) => (r.notes ?? '').trim()).filter(Boolean))],
    pending,
    pendingTotal: pending.reduce((sum, r) => sum + Number(r.amount_requested || 0), 0),
  };
}

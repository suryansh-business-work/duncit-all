import type { VenueBillTerms } from '@duncit/utils';
import type { PaymentReleaseRow, ReleaseBreakdown } from '../queries';

/** The booking offer the venue's amount was agreed at: its pricing model and rate. */
export interface ReleaseAgreedTerms {
  model: string;
  rate: number;
}

/** Everything the request page derives from the payouts on it. */
export interface ReleaseRequestView {
  /** The venue bill + attendance figures, or null on a request with no v2 snapshot. */
  terms: VenueBillTerms | null;
  /** The agreed offer, or null for a booking made before offers (and older releases). */
  agreed: ReleaseAgreedTerms | null;
  /** False on a pod with no venue payout — only the attendance line applies. */
  hasVenue: boolean;
  billUrl: string;
  media: { url: string; type: string }[];
  notes: string[];
  pending: PaymentReleaseRow[];
  pendingTotal: number;
}

/** The agreed offer frozen on the snapshot — both halves, or nothing to state. */
function agreedOf(snapshot: ReleaseBreakdown): ReleaseAgreedTerms | null {
  const model = snapshot.venue_agreed_model;
  const rate = snapshot.venue_agreed_rate;
  return model && rate != null ? { model, rate } : null;
}

/**
 * Reads one request's shared facts off its payouts.
 *
 * Every payout a completion creates carries the same frozen attendance and
 * venue terms, so any of them answers; the venue's own release is preferred
 * because its `share_amount` IS the venue total. Nothing is computed here —
 * the figures are the settlement snapshot's: the extra charges paid on top of
 * the agreed amount, and for a per-guest booking its minimum and the guests it
 * was paid for (`venue_pax`, never below that minimum). Releases from before
 * those were frozen carry 0 for each (the server's default), which leaves their
 * lines out.
 */
export function buildReleaseRequestView(releases: readonly PaymentReleaseRow[]): ReleaseRequestView {
  const venue = releases.find((r) => r.kind === 'VENUE_BILLING' && r.breakdown);
  const snapshot = (venue ?? releases.find((r) => r.breakdown))?.breakdown;
  const current = snapshot && snapshot.version >= 2 ? snapshot : null;
  const terms: VenueBillTerms | null = current
    ? {
        slot_price: current.venue_slot_price,
        bill: current.venue_bill,
        slot_included: current.include_slot_price,
        venue_amount: venue?.breakdown?.share_amount ?? 0,
        attended_seats: current.attended_seats,
        booked_seats: current.booked_seats,
        extra: current.venue_extra_amount,
        min_guests: current.venue_min_guests,
        people_counted: current.venue_pax,
      }
    : null;

  const media = new Map<string, { url: string; type: string }>();
  for (const release of releases) {
    for (const item of release.evidence_media ?? []) media.set(item.url, item);
  }
  const pending = releases.filter((r) => r.status === 'PENDING');

  return {
    terms,
    agreed: current ? agreedOf(current) : null,
    hasVenue: !!venue,
    billUrl: releases.find((r) => r.bill_url)?.bill_url ?? '',
    media: [...media.values()],
    notes: [...new Set(releases.map((r) => (r.notes ?? '').trim()).filter(Boolean))],
    pending,
    pendingTotal: pending.reduce((sum, r) => sum + Number(r.amount_requested || 0), 0),
  };
}

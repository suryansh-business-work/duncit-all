/** A booking's offer as the venue's inbox, the chat and the host's pod page read it. Pure. */
import {
  currentOfferModel,
  type VenueOffer,
  type VenueOfferHistoryEntry,
  type VenueOfferParty,
  type VenueOfferProposal,
} from './venueOffer.types';

interface OfferSlot {
  _id: unknown;
  venue_id: unknown;
  booked_by_pod_id?: unknown;
  decided_pod_id?: unknown;
  start_at: Date;
  end_at: Date;
  space_label?: string | null;
  offer: VenueOffer | null;
}

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

/**
 * A frozen quote as the API shows it, read field by field: a slot read without
 * `.lean()` holds its quotes as subdocuments, whose fields sit behind getters
 * that a spread does not copy — the response would carry none of them.
 */
const quoteOut = (q: VenueOffer['quote']) => ({
  model: q.model,
  rate: q.rate,
  pax: q.pax,
  hours: q.hours,
  date: q.date,
  base: q.base,
  rules: (q.rules ?? []).map((r) => ({ type: r.type, label: r.label, mode: r.mode, value: r.value, amount: r.amount })),
  rules_total: q.rules_total,
  min_spend_top_up: q.min_spend_top_up,
  cleaning_fee: q.cleaning_fee,
  pet_fee: q.pet_fee,
  venue_price: q.venue_price,
  gst_pct: q.gst_pct,
  taxes: q.taxes,
  venue_payout: q.venue_payout,
  platform_fee_pct: q.platform_fee_pct,
  platform_fee: q.platform_fee,
  total: q.total,
  deposit: q.deposit,
  confirmed_at: iso(q.confirmed_at),
});

/** Counters this side has made on the offer so far (the opening offer is not one; a withdrawn one is gone). */
export const countersUsed = (offer: Pick<VenueOffer, 'history'>, side: VenueOfferParty): number =>
  (offer.history ?? []).filter((step) => step.action === 'COUNTER' && step.by === side).length;

/** Whose move it is: the venue answers the host's terms, the host answers the venue's. */
export function awaitingParty(offer: Pick<VenueOffer, 'status'>): VenueOfferParty | null {
  if (offer.status === 'SENT') return 'VENUE';
  if (offer.status === 'COUNTERED') return 'HOST';
  return null;
}

/**
 * The latest terms: the venue's counter when there is one, else the host's.
 * A host's counter-back clears the venue's counter, so a counter that is still
 * there IS the latest — on the table while pending, the terms that were taken
 * once accepted, the terms turned down once declined.
 */
export function currentTerms(offer: VenueOffer): VenueOfferProposal {
  return offer.counter ?? offer;
}

/** The side whose terms are on the table — the one who moved last. */
export const proposerOf = (offer: Pick<VenueOffer, 'status'>): VenueOfferParty =>
  offer.status === 'COUNTERED' ? 'VENUE' : 'HOST';

/** One negotiation step, read field by field for the same reason as `quoteOut`. */
const historyOut = (h: VenueOfferHistoryEntry) => ({
  by: h.by,
  action: h.action,
  model: h.model ? currentOfferModel(h.model) : null,
  rate: h.rate,
  total: h.total,
  min_guests: h.min_guests ?? null,
  note: h.note,
  at: iso(h.at),
});

/** One side's proposal as the API shows it. An offer from before minimums reads its guests as both ends. */
function proposalOut(p: VenueOfferProposal, pax: number) {
  return {
    model: currentOfferModel(p.model),
    rate: p.rate,
    min_guests: p.min_guests || pax,
    offerings: [...(p.offerings ?? [])],
    images: [...(p.images ?? [])],
    note: p.note ?? '',
    quote: quoteOut(p.quote),
    quote_min: quoteOut(p.quote_min ?? p.quote),
  };
}

export function offerView(slot: OfferSlot) {
  const offer = slot.offer;
  if (!offer) return null;
  const podId = slot.booked_by_pod_id ?? slot.decided_pod_id;
  const host = proposalOut(offer, offer.pax);
  return {
    slot_id: String(slot._id),
    venue_id: String(slot.venue_id),
    pod_id: podId ? String(podId) : null,
    start_at: slot.start_at.toISOString(),
    end_at: slot.end_at.toISOString(),
    space_label: slot.space_label ?? '',
    pax: offer.pax,
    pets: offer.pets,
    ...host,
    status: offer.status,
    round: offer.round,
    counter: offer.counter ? { ...proposalOut(offer.counter, offer.pax), at: iso(offer.counter.at) } : null,
    history: (offer.history ?? []).map(historyOut),
    awaiting: awaitingParty(offer),
    expires_at: iso(offer.expires_at),
    host_counters_used: countersUsed(offer, 'HOST'),
    venue_counters_used: countersUsed(offer, 'VENUE'),
  };
}

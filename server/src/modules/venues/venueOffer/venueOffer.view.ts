/** A booking's offer as the venue's inbox, the chat and the host's pod page read it. Pure. */
import type {
  VenueOffer,
  VenueOfferHistoryEntry,
  VenueOfferParty,
  VenueOfferProposal,
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

const quoteOut = (quote: VenueOffer['quote']) => ({ ...quote, confirmed_at: iso(quote.confirmed_at) });

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

const historyOut = (h: VenueOfferHistoryEntry) => ({ ...h, min_guests: h.min_guests ?? null, at: iso(h.at) });

/** One side's proposal as the API shows it. An offer from before minimums reads its guests as both ends. */
function proposalOut(p: VenueOfferProposal, pax: number) {
  return {
    model: p.model,
    rate: p.rate,
    min_guests: p.min_guests || pax,
    offerings: [...(p.offerings ?? [])],
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
  };
}

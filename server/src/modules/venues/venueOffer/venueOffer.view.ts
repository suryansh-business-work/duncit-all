/** A booking's offer as the venue's inbox and the host's pod page read it. Pure. */
import type { VenueOffer, VenueOfferHistoryEntry, VenueOfferParty, VenueOfferTerms } from './venueOffer.types';

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

/** Whose move it is: the venue answers an offer, the host answers a counter. */
export function awaitingParty(offer: Pick<VenueOffer, 'status'>): VenueOfferParty | null {
  if (offer.status === 'SENT') return 'VENUE';
  if (offer.status === 'COUNTERED') return 'HOST';
  return null;
}

/** The terms on the table now: the venue's counter while it stands, else the host's offer. */
export function currentTerms(offer: VenueOffer): VenueOfferTerms & { quote: VenueOffer['quote'] } {
  return offer.status === 'COUNTERED' && offer.counter ? offer.counter : offer;
}

const historyOut = (h: VenueOfferHistoryEntry) => ({ ...h, at: iso(h.at) });

export function offerView(slot: OfferSlot) {
  const offer = slot.offer;
  if (!offer) return null;
  const podId = slot.booked_by_pod_id ?? slot.decided_pod_id;
  return {
    slot_id: String(slot._id),
    venue_id: String(slot.venue_id),
    pod_id: podId ? String(podId) : null,
    start_at: slot.start_at.toISOString(),
    end_at: slot.end_at.toISOString(),
    space_label: slot.space_label ?? '',
    model: offer.model,
    rate: offer.rate,
    pax: offer.pax,
    pets: offer.pets,
    quote: quoteOut(offer.quote),
    status: offer.status,
    round: offer.round,
    counter: offer.counter
      ? { model: offer.counter.model, rate: offer.counter.rate, quote: quoteOut(offer.counter.quote), note: offer.counter.note, at: iso(offer.counter.at) }
      : null,
    history: (offer.history ?? []).map(historyOut),
    awaiting: awaitingParty(offer),
  };
}

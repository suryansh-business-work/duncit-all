/**
 * Venue offers — the VENUE's side: its booking-requests inbox on the Partners
 * console, mWeb and the native app (rules 29 + 56).
 *
 * A host books a venue by offering terms (`venue-offer.ts`); the venue accepts,
 * rejects or counters them, and a counter goes back to the host. These helpers
 * read where a request stands and what the venue may do with it — they never
 * price anything (the server's quote is what every surface prints). Every copy
 * key is written out literally, so the translation gate can see it.
 */
import { isVenueOfferModel, type VenueOfferModel } from './venue-offer';

/** Who moves next on an offer (`VenueOfferParty`). */
export type VenueOfferParty = 'HOST' | 'VENUE';

/** The pieces of an offer the inbox reads; the quote is whatever each surface's breakdown type is. */
export interface InboxOffer<Q> {
  model: string;
  rate: number;
  quote: Q;
  status: string;
  awaiting?: string | null;
  counter?: { model: string; rate: number; quote: Q; note?: string | null } | null;
}

/** The terms on the table, and whose they are. */
export interface CurrentOfferTerms<Q> {
  by: VenueOfferParty;
  model: string;
  rate: number;
  quote: Q;
}

/** The venue's counter while there is one, else the host's offer. */
export function currentOfferTerms<Q>(offer: Readonly<InboxOffer<Q>>): CurrentOfferTerms<Q> {
  const counter = offer.counter;
  if (counter) return { by: 'VENUE', model: counter.model, rate: counter.rate, quote: counter.quote };
  return { by: 'HOST', model: offer.model, rate: offer.rate, quote: offer.quote };
}

/** Each pricing option's name, and how its amount reads ("₹{rate} per guest"), in the inbox. */
export const VENUE_OFFER_INBOX_MODEL_KEY: Readonly<Record<VenueOfferModel, { label: string; rate: string }>> = {
  PER_GUEST: { label: 'availability.offers.model.perGuest', rate: 'availability.offers.rate.perGuest' },
  PER_HOUR: { label: 'availability.offers.model.perHour', rate: 'availability.offers.rate.perHour' },
  PER_SLOT: { label: 'availability.offers.model.perSlot', rate: 'availability.offers.rate.perSlot' },
  FLAT: { label: 'availability.offers.model.flat', rate: 'availability.offers.rate.flat' },
};

/** A pricing option's keys, or null for one this client does not know. */
export const venueOfferInboxModelKey = (model: string | null | undefined) =>
  isVenueOfferModel(model) ? VENUE_OFFER_INBOX_MODEL_KEY[model] : null;

export type OfferStatusTone = 'warning' | 'info' | 'success' | 'error';

const INBOX_STATUS: Readonly<Record<string, { key: string; tone: OfferStatusTone }>> = {
  SENT: { key: 'availability.offers.status.yourMove', tone: 'warning' },
  COUNTERED: { key: 'availability.offers.status.countered', tone: 'info' },
  ACCEPTED: { key: 'availability.offers.status.accepted', tone: 'success' },
  DECLINED: { key: 'availability.offers.status.declined', tone: 'error' },
};

/** Where a request stands, as the venue is told — and the chip's tone. */
export function venueOfferInboxStatus(offer: Readonly<Pick<InboxOffer<unknown>, 'status'>>): { key: string; tone: OfferStatusTone } {
  return INBOX_STATUS[offer.status] ?? { key: '', tone: 'info' };
}

/** What the venue may do now: a fresh offer takes all three; while its counter waits it may change it or say no. */
export function venueOfferActions(offer: Readonly<Pick<InboxOffer<unknown>, 'status'>>) {
  const open = offer.status === 'SENT' || offer.status === 'COUNTERED';
  return { accept: offer.status === 'SENT', reject: open, counter: open };
}

const HISTORY_KEY: Readonly<Record<string, string>> = {
  'HOST:OFFER': 'availability.offers.history.hostOffer',
  'HOST:COUNTER': 'availability.offers.history.hostCounter',
  'HOST:ACCEPT': 'availability.offers.history.hostAccept',
  'HOST:REJECT': 'availability.offers.history.hostReject',
  'VENUE:OFFER': 'availability.offers.history.venueCounter',
  'VENUE:COUNTER': 'availability.offers.history.venueCounter',
  'VENUE:ACCEPT': 'availability.offers.history.venueAccept',
  'VENUE:REJECT': 'availability.offers.history.venueReject',
};

/** One negotiation step's sentence key ("The host offered", "You countered", …), or '' for one this client does not know. */
export const venueOfferHistoryKey = (entry: Readonly<{ by: string; action: string }>): string =>
  HISTORY_KEY[`${entry.by}:${entry.action}`] ?? '';

import { addDays } from 'date-fns';
import { dateToTimeOfDay, toIsoDay } from '@duncit/datetime';
import { isVenueOfferModel, type VenueOfferModel } from '@duncit/utils';
import { wallInstant } from '../../pricing/preview/usePriceQuote';
import type { EventRequestOfferView } from '../queries';

export type RespondChoice = 'ACCEPT' | 'REJECT' | 'COUNTER';

/** The respond dialog's values. The window and terms are only read for a counter offer. */
export interface RespondEventRequestValues {
  note: string;
  /** 'yyyy-MM-dd' */
  date: string;
  /** 'HH:mm' */
  start: string;
  /** 'HH:mm' */
  end: string;
  /** NaN while emptied. */
  pax: number;
  /** A `VenueOfferModel` — how the counter prices the window. */
  model: string;
  /** The amount as typed (rupees per guest, per hour, for the slot, or flat). */
  rate: string;
}

const clock = (iso: string) => dateToTimeOfDay(new Date(iso), '18:00');

/** Starts from the request's current offer, else tomorrow evening for 10 guests, at a flat price. */
export function respondDefaults(offer: EventRequestOfferView | null): RespondEventRequestValues {
  const terms = { model: 'FLAT', rate: '' };
  if (offer) {
    return { note: '', date: toIsoDay(new Date(offer.start_at)), start: clock(offer.start_at), end: clock(offer.end_at), pax: offer.pax, ...terms };
  }
  return { note: '', date: toIsoDay(addDays(new Date(), 1)), start: '18:00', end: '20:00', pax: 10, ...terms };
}

/** The counter's price terms, or null until a pricing option and an amount above 0 are set. */
export function offerTerms(values: Readonly<Pick<RespondEventRequestValues, 'model' | 'rate'>>): { model: VenueOfferModel; rate: number } | null {
  const typed = values.rate.trim();
  const rate = Number(typed);
  if (!isVenueOfferModel(values.model) || typed === '' || !Number.isFinite(rate) || rate <= 0) return null;
  return { model: values.model, rate };
}

/** The offer as the mutation takes it (instants on this device's clock), with its price terms. */
export function offerInput(values: RespondEventRequestValues) {
  const start_at = wallInstant(values.date, values.start);
  const end_at = wallInstant(values.date, values.end);
  const terms = offerTerms(values);
  if (!start_at || !end_at || !terms) return null;
  return { start_at, end_at, pax: Math.max(0, Math.floor(values.pax || 0)), ...terms };
}

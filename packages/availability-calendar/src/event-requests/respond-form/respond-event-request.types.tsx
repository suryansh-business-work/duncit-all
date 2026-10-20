import { addDays } from 'date-fns';
import { dateToTimeOfDay, toIsoDay } from '@duncit/datetime';
import { wallInstant } from '../../pricing/preview/usePriceQuote';
import type { EventRequestOfferView } from '../queries';

export type RespondChoice = 'ACCEPT' | 'REJECT' | 'COUNTER';

/** The respond dialog's values. The window is only read for a counter offer. */
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
}

const clock = (iso: string) => dateToTimeOfDay(new Date(iso), '18:00');

/** Starts from the request's current offer, else tomorrow evening for 10 guests. */
export function respondDefaults(offer: EventRequestOfferView | null): RespondEventRequestValues {
  if (offer) {
    return { note: '', date: toIsoDay(new Date(offer.start_at)), start: clock(offer.start_at), end: clock(offer.end_at), pax: offer.pax };
  }
  return { note: '', date: toIsoDay(addDays(new Date(), 1)), start: '18:00', end: '20:00', pax: 10 };
}

/** The offer as the mutation takes it (instants on this device's clock). */
export function offerInput(values: RespondEventRequestValues) {
  const start_at = wallInstant(values.date, values.start);
  const end_at = wallInstant(values.date, values.end);
  if (!start_at || !end_at) return null;
  return { start_at, end_at, pax: Math.max(0, Math.floor(values.pax || 0)) };
}

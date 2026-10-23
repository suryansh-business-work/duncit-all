import { addDays } from 'date-fns';
import { toIsoDay } from '@duncit/datetime';
import { wallInstant } from '../../pricing/preview/usePriceQuote';
import { offerTerms } from '../../event-requests/respond-form/respond-event-request.types';

/** A proposed booking: a day, a start and an end, the space, the guests and how the venue is paid. */
export interface WindowOfferValues {
  /** 'yyyy-MM-dd' */
  date: string;
  /** 'HH:mm' */
  start: string;
  /** 'HH:mm' */
  end: string;
  /** '' = the whole venue. */
  space: string;
  /** NaN while emptied. */
  pax: number;
  /** A `VenueOfferModel`. */
  model: string;
  /** The amount as typed (rupees per guest, per hour, for the slot, or flat). */
  rate: string;
}

/** The window and terms as the server takes them (`VenueOfferInput` and its twins). */
export interface WindowOfferInput {
  start_at: string;
  end_at: string;
  space_label: string;
  pax: number;
  model: string;
  rate: number;
}

/** Starts tomorrow evening at a flat price; `pax` is the guests already known (the pod's spots). */
export function windowOfferDefaults(pax = 10): WindowOfferValues {
  return { date: toIsoDay(addDays(new Date(), 1)), start: '18:00', end: '20:00', space: '', pax, model: 'FLAT', rate: '' };
}

/** The proposal as the mutation takes it (instants on this device's clock), or null until it is complete. */
export function windowOfferInput(values: WindowOfferValues): WindowOfferInput | null {
  const start_at = wallInstant(values.date, values.start);
  const end_at = wallInstant(values.date, values.end);
  const terms = offerTerms(values);
  if (!start_at || !end_at || end_at <= start_at || !terms) return null;
  return { start_at, end_at, space_label: values.space, pax: Math.max(0, Math.floor(values.pax || 0)), ...terms };
}

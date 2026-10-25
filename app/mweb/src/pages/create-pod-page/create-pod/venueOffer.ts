import { gql, type TypedDocumentNode } from '@apollo/client';
import type { QueryVenueOfferCalendarArgs, QueryVenueOfferQuoteArgs } from '@duncit/gql-types';
import {
  VENUE_OFFER_CALENDAR_SDL,
  VENUE_OFFER_QUOTE_SDL,
  type BookingCalendarDay,
  type VenueQuote,
} from '@duncit/utils';

/** Which days and times the venue is open and free (≤ 62 days a call). */
export const VENUE_OFFER_CALENDAR: TypedDocumentNode<
  { venueOfferCalendar: { buffer_minutes: number; min_notice_minutes: number; days: BookingCalendarDay[] } },
  QueryVenueOfferCalendarArgs
> = gql(VENUE_OFFER_CALENDAR_SDL);

/** The server's price for the host's offer at the most guests (`quote`) and
 * the fewest (`quote_min`) — or why it cannot be sent. */
export const VENUE_OFFER_QUOTE: TypedDocumentNode<
  { venueOfferQuote: { ok: boolean; message: string | null; quote: VenueQuote | null; quote_min: VenueQuote | null } },
  QueryVenueOfferQuoteArgs
> = gql(VENUE_OFFER_QUOTE_SDL);

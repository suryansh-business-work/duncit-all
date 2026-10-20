import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  QueryVenueBookingCalendarArgs,
  QueryVenuePriceQuoteArgs,
  QueryVenuePricingArgs,
  VenuePricing,
} from '@duncit/gql-types';
import {
  VENUE_BOOKING_CALENDAR_SDL,
  VENUE_BOOKING_PRICING_SDL,
  VENUE_PRICE_QUOTE_SDL,
  type BookingCalendarDay,
  type VenueQuote,
} from '@duncit/utils';

export type VenueBookingPricing = Pick<
  VenuePricing,
  'model' | 'configured' | 'min_pax' | 'max_pax' | 'min_hours' | 'max_hours' | 'booking_increment_minutes' | 'pet_fee'
>;

/** The venue's pricing gate and limits — step 3 asks once a venue is picked. */
export const VENUE_BOOKING_PRICING: TypedDocumentNode<
  { venuePricing: VenueBookingPricing },
  QueryVenuePricingArgs
> = gql(VENUE_BOOKING_PRICING_SDL);

/** Which days and times the venue is free (≤ 62 days a call). */
export const VENUE_BOOKING_CALENDAR: TypedDocumentNode<
  { venueBookingCalendar: { buffer_minutes: number; min_notice_minutes: number; days: BookingCalendarDay[] } },
  QueryVenueBookingCalendarArgs
> = gql(VENUE_BOOKING_CALENDAR_SDL);

/** The server's price for one window — the host never sends or edits a price. */
export const VENUE_PRICE_QUOTE: TypedDocumentNode<
  { venuePriceQuote: VenueQuote },
  Omit<QueryVenuePriceQuoteArgs, 'draft'>
> = gql(VENUE_PRICE_QUOTE_SDL);

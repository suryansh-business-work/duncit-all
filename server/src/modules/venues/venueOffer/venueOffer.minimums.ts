/**
 * The venue's minimums a HOST's terms must meet, whichever way they reach the
 * venue: Create Pod's opening offer (create, edit, resubmit — and its live
 * quote, which reports the same refusal) and every counter-back or counter edit
 * the host makes in the venue chat. Nothing a host sends skips them.
 *
 * - the fewest guests: the venue's minimum (its own, else the platform's),
 *   never more than the space holds or the booking's guests (BELOW_VENUE_MINIMUM);
 * - the business amount on the offer's basis (BELOW_MIN_BUSINESS);
 * - the minimum spend — the offer's own amount at the fewest guests
 *   (BELOW_MIN_SPEND).
 *
 * The venue's own counters, and the terms a venue names itself (Auto Pods, Pod
 * Requests, change requests), are its own choice and are not held. A free ask
 * carries no price, so only its guests are held — and it reaches only a venue
 * open to free bookings for initiatives (FREE_BOOKING_OFF).
 */
import { GraphQLError } from 'graphql';
import {
  assertOfferMeetsMinBusiness,
  assertOfferMeetsMinSpend,
  assertVenueTakesFreeBookings,
  venueOfferSettingsOf,
  type IVenueOfferSettings,
} from '@modules/venues/venue/venue.offerSettings';
import type { VenuePriceBreakdown } from '@modules/venues/venuePricing/venuePricing.types';
import { FREE_OFFER_MODEL, type VenueOfferTerms } from './venueOffer.types';

export type MinimumsVenue = { settings?: { offers?: Partial<IVenueOfferSettings> | null } | null };

/**
 * The host's price terms meet the venue's business amount and minimum spend; a
 * free ask, that the venue takes free bookings at all. `quoteMin` is the terms
 * priced at the fewest guests.
 */
export function assertHostPriceMeetsVenue(
  venue: MinimumsVenue,
  terms: Pick<VenueOfferTerms, 'model' | 'rate'>,
  quoteMin: Pick<VenuePriceBreakdown, 'base'>
): void {
  const offers = venue.settings?.offers;
  if (terms.model === FREE_OFFER_MODEL) {
    assertVenueTakesFreeBookings(offers);
    return;
  }
  assertOfferMeetsMinBusiness(offers?.min_business, terms.model, terms.rate);
  assertOfferMeetsMinSpend(offers?.min_spend, terms.model, quoteMin.base);
}

/**
 * The fewest guests a host's counter asks for is at least the venue's minimum —
 * capped by the space's capacity (0 = uncapped) and by the booking's own guests,
 * so a pod the venue already took is never stuck.
 */
export async function assertHostMinGuestsMeetVenue(
  venue: MinimumsVenue,
  minGuests: number,
  pax: number,
  capacity: number
): Promise<void> {
  const { min_guests } = await venueOfferSettingsOf(venue);
  const caps = [Math.max(1, Math.floor(min_guests) || 1), Math.max(1, Math.floor(pax) || 1)];
  if (capacity > 0) caps.push(capacity);
  const floor = Math.min(...caps);
  if (minGuests >= floor) return;
  throw new GraphQLError(`This venue takes bookings for at least ${floor} guests — ask for ${floor} or more`, {
    extensions: { code: 'BAD_USER_INPUT', reason: 'BELOW_VENUE_MINIMUM', field: 'min_guests', min_guests: floor },
  });
}

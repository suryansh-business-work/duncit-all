/**
 * Venue settings > Booking offers: the form (RHF + Zod), its rules and mappers,
 * and the card that saves it for the picked venue. mWeb asks the owner the same
 * two numbers with the same `venueSettings.offers.*` copy.
 */
export { default as BookingOffersCard } from './BookingOffersCard';
export { default as BookingOffersForm } from './booking-offers.form';
export {
  BOOKING_OFFER_LIMITS,
  makeBookingOffersSchema,
  toBookingOffersInput,
  toBookingOffersValues,
} from './booking-offers.schema';
export type {
  BookingOffersFormProps,
  BookingOffersValues,
  EffectiveOfferSettings,
  VenueOfferSettings,
} from './booking-offers.types';

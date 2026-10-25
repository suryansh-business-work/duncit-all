import type { NestedCatalogue } from '../catalogue';

/**
 * Venue settings copy — the cancellation policy a venue owner writes for their
 * bookings — as a namespace of its own, not a surface's.
 *
 * The policy's rules live in `@duncit/forms/schemas` because the Partners
 * console, mWeb AND the native app all ask the owner for the same bands, and
 * the sentences a band is refused with have to travel with the rules. They
 * were `partners.venueSettingsPage.*` before, which the two apps do not ship.
 *
 * The policy is written as bands: a band charges for cancelling INSIDE its
 * window, so a booking cancelled outside every band is free — the copy says
 * that rather than leaving the owner to infer it from an empty list.
 */
export const VENUE_SETTINGS_BUNDLE: NestedCatalogue = {
  venueSettings: {
    title: 'Venue settings',
    subtitle: 'Rules that apply to bookings at your venue.',
    venue: 'Venue',
    noVenues: 'Register a venue first — settings apply to a venue you own.',
    cancellationTitle: 'Cancellation policy',
    rescheduleOnly: 'Reschedule only — no cancellations',
    rescheduleOnlyHint:
      'Guests may move a booking to another slot, but not cancel it. Your cancellation charges do not apply while this is on.',
    policyDisabled: 'Cancellation charges are off because this venue is reschedule-only.',
    bandsTitle: 'Cancellation charges',
    bandsHint:
      'Each row charges for cancelling within that many hours of the start. The tightest matching row wins, and a cancellation outside every row is free.',
    noBands: 'No charges yet — cancelling is free at any time.',
    addBand: 'Add a charge',
    removeTier: 'Remove this charge',
    tierHours: 'Cancel within (hours)',
    tierChargeType: 'Charge',
    tierValue: 'Amount',
    chargePercent: 'Percent of slot price',
    chargeAmount: 'Flat amount',
    save: 'Save policy',
    saving: 'Saving…',
    saved: 'Cancellation policy saved.',
    /** The sentences `makeCancellationPolicySchema` refuses a band with. */
    validation: {
      hoursRequired: 'Enter the hours before the slot',
      wholeHours: 'Use whole hours',
      hoursNegative: 'Hours cannot be negative',
      hoursMax: 'Use 8760 hours (a year) or less',
      chargeRequired: 'Enter the charge',
      chargeNegative: 'The charge cannot be negative',
      percentMax: 'A percentage cannot go above 100',
      duplicateWindow: 'Another band already covers this window',
    },
    // Booking offers: the fewest guests a host's offer may be for, and the
    // hours either side has to answer an offer or a counter (VenueSettings.offers).
    // 0 = Duncit's platform default; the hint states what is in effect. Shared
    // by the Partners console, mWeb, the Venues console and (later) native.
    offers: {
      title: 'Booking offers',
      intro:
        'How hosts book your venue: the fewest guests an offer may be for, and how long you and the host each have to answer an offer or a counter before it expires. Leave a value at 0 to use Duncit’s default.',
      minGuests: 'Minimum guests',
      minGuestsHint: '0 uses Duncit’s default. In effect now: {count} guests.',
      minGuestsInvalid: 'Enter a whole number of guests from 0 to {max}',
      responseHours: 'Response time (hours)',
      responseHoursHint: '0 uses Duncit’s default. In effect now: {count} hours.',
      responseHoursInvalid: 'Enter a whole number of hours from 0 to {max}',
      guestsValue: '{count} guests',
      hoursValue: '{count} hours',
      usingDefault: 'Duncit’s default',
      save: 'Save booking offers',
      saved: 'Booking offers saved.',
    },
  },
};

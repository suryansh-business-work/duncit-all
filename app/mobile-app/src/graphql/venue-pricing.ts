import { gql } from '@/generated/graphql';

/**
 * The Venue Pricing Module, for a venue owner on their phone — the same
 * operations the Partners console and mWeb fire. Hosts book a venue instantly
 * at this pricing; the price itself is only ever computed on the server
 * (`venuePriceQuote`), the app shows what it answers.
 *
 * Selections are written out in full: the mobile codegen reads these templates
 * statically, so a spliced-in fragment string is not an option.
 */
export const VenuePricingDocument = gql(`
  query MobileVenuePricing($venue_id: ID!) {
    venuePricing(venue_id: $venue_id) {
      model
      configured
      base_rate
      min_pax
      max_pax
      min_hours
      max_hours
      booking_increment_minutes
      min_spend
      slots {
        start_time
        end_time
        price
        days_of_week
      }
      operating_hours {
        day
        open
        close
      }
      price_rules {
        type
        label
        days
        dates
        from
        to
        mode
        value
      }
      deposit
      cleaning_fee
      pet_fee
      gst_enabled
      blocked_dates
    }
  }
`);

/** The server replaces the whole pricing on save, so callers always send all of it. */
export const UpdateVenuePricingDocument = gql(`
  mutation MobileUpdateVenuePricing($venue_id: ID!, $input: VenuePricingInput!) {
    updateVenuePricing(venue_id: $venue_id, input: $input) {
      configured
    }
  }
`);

/** One window priced by the server; `draft` previews the owner's unsaved pricing. */
export const VenuePriceQuoteDocument = gql(`
  query MobileVenuePriceQuote(
    $venue_id: ID!
    $booking: InstantBookingInput!
    $draft: VenuePricingInput
  ) {
    venuePriceQuote(venue_id: $venue_id, booking: $booking, draft: $draft) {
      base
      rules {
        label
        amount
      }
      min_spend_top_up
      cleaning_fee
      pet_fee
      taxes
      venue_payout
      platform_fee
      total
      deposit
    }
  }
`);

/** What each visible day looks like to a host: closed (and why) and, per slot, the price. */
export const VenueBookingCalendarDocument = gql(`
  query MobileVenueBookingCalendar($venue_id: ID!, $from: String!, $to: String!) {
    venueBookingCalendar(venue_id: $venue_id, from: $from, to: $to) {
      days {
        date
        closed_reason
        busy {
          start
          end
        }
        slots {
          start
          end
          price
          available
        }
      }
    }
  }
`);

/** Confirmed instant bookings, soonest first — read-only on the owner's side. */
export const VenueUpcomingBookingsDocument = gql(`
  query MobileVenueUpcomingBookings($venue_id: ID, $limit: Int) {
    myVenueUpcomingBookings(venue_id: $venue_id, limit: $limit) {
      slot_id
      pod_title
      start_at
      end_at
      space_label
      venue_payout
    }
  }
`);

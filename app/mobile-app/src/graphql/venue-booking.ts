import { gql } from '@/generated/graphql';

/**
 * Create Pod's instant venue booking, for the host — the same operations mWeb
 * sends (`@duncit/utils` VENUE_BOOKING_*_SDL, rule 29). Written out in full
 * because the mobile codegen reads these templates statically. The venue
 * owner's pricing documents live in ./venue-pricing.
 */
export const HostBookingPricingDocument = gql(`
  query MobileHostBookingPricing($venue_id: ID!) {
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
    }
  }
`);

/** Which days and times the venue is free (at most 62 days a call). */
export const HostBookingCalendarDocument = gql(`
  query MobileHostBookingCalendar(
    $venue_id: ID!
    $from: String!
    $to: String!
    $space_label: String
  ) {
    venueBookingCalendar(venue_id: $venue_id, from: $from, to: $to, space_label: $space_label) {
      buffer_minutes
      min_notice_minutes
      days {
        date
        closed_reason
        open
        close
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

/** The server's price for the picked window — the host never sends a price. */
export const HostVenuePriceQuoteDocument = gql(`
  query MobileHostVenuePriceQuote($venue_id: ID!, $booking: InstantBookingInput!) {
    venuePriceQuote(venue_id: $venue_id, booking: $booking) {
      model
      rate
      pax
      hours
      base
      rules {
        type
        label
        amount
      }
      min_spend_top_up
      cleaning_fee
      pet_fee
      gst_pct
      taxes
      platform_fee_pct
      platform_fee
      venue_payout
      total
      deposit
    }
  }
`);

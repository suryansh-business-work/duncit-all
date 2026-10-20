import { gql } from '@apollo/client';

/** Every pricing field the Venue Pricing Module edits — one selection for the read and the save. */
const PRICING_FIELDS = `
  model
  configured
  base_rate
  min_pax
  max_pax
  min_hours
  max_hours
  booking_increment_minutes
  min_spend
  slots { start_time end_time price days_of_week }
  operating_hours { day open close }
  price_rules { type label days dates from to mode value }
  deposit
  cleaning_fee
  pet_fee
  gst_enabled
  blocked_dates
`;

/**
 * How a price was built. A plain string so the event-request offer (a frozen
 * quote) and the live preview select the same lines.
 */
export const BREAKDOWN_FIELDS = `
  model
  rate
  pax
  hours
  date
  base
  rules { type label mode value amount }
  rules_total
  min_spend_top_up
  cleaning_fee
  pet_fee
  venue_price
  gst_pct
  taxes
  venue_payout
  platform_fee_pct
  platform_fee
  total
  deposit
`;

export const VENUE_PRICING = gql`
  query VenuePricingModule($venue_id: ID!) {
    venuePricing(venue_id: $venue_id) { ${PRICING_FIELDS} }
  }
`;

export const UPDATE_VENUE_PRICING = gql`
  mutation UpdateVenuePricing($venue_id: ID!, $input: VenuePricingInput!) {
    updateVenuePricing(venue_id: $venue_id, input: $input) { ${PRICING_FIELDS} }
  }
`;

/** `draft` = the owner's unsaved pricing; omitted, the venue's saved pricing is quoted. */
export const VENUE_PRICE_QUOTE = gql`
  query VenuePriceQuote($venue_id: ID!, $booking: InstantBookingInput!, $draft: VenuePricingInput) {
    venuePriceQuote(venue_id: $venue_id, booking: $booking, draft: $draft) { ${BREAKDOWN_FIELDS} }
  }
`;

export const VENUE_BOOKING_CALENDAR = gql`
  query VenuePricingCalendar($venue_id: ID!, $from: String!, $to: String!) {
    venueBookingCalendar(venue_id: $venue_id, from: $from, to: $to) {
      model
      configured
      booking_increment_minutes
      min_hours
      max_hours
      min_pax
      max_pax
      days {
        date
        closed_reason
        open
        close
        busy { start end }
        slots { start end price available }
      }
    }
  }
`;

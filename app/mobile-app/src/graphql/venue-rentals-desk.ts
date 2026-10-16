import { gql } from '@/generated/graphql';

/**
 * A venue's rental desk on the app — the same operations @duncit/venue-rentals
 * sends on the web (`@duncit/utils` venue-rentals), re-declared inline because
 * the app's codegen only sees documents written in this workspace.
 */

/** The owner's rented items, their terms, and the editor's caps. */
export const OwnerRentalItemsDocument = gql(`
  query MobileOwnerRentalItems($venue_id: ID!) {
    myVenue(venue_id: $venue_id) {
      id
      venue_name
      status
      offers_rentals
      rental_terms_html
      rental_deposit_gst
      rental_items {
        id
        name
        description
        images
        unit
        rate
        deposit
        stock
        per_guest_limit
        is_available
      }
    }
    venueRegistrationConfig {
      rental_units
      rental_item_limit
      rental_image_limit
      rental_rate_max
      rental_deposit_max
      rental_stock_max
      rental_per_guest_max
      rental_terms_max
    }
  }
`);

/** Saves the whole list (each kept item with its id) through the approved-venue edit. */
export const UpdateVenueRentalsDocument = gql(`
  mutation MobileUpdateVenueRentals($venue_id: ID!, $input: UpdateApprovedVenueInput!) {
    updateApprovedVenue(venue_id: $venue_id, input: $input) {
      id
      offers_rentals
      rental_terms_html
      rental_items {
        id
        name
        description
        images
        unit
        rate
        deposit
        stock
        per_guest_limit
        is_available
      }
    }
  }
`);

/** The venue's rental bookings, newest first, and its numbers. */
export const VenueRentalDeskDocument = gql(`
  query MobileVenueRentalDesk($venue_id: ID!, $query: TableQueryInput) {
    venueRentalBookingsTable(venue_id: $venue_id, query: $query) {
      total
      rows {
        id
        currency_symbol
        pod_title
        guest_name
        name
        image_url
        unit
        units
        quantity
        rent_amount
        deposit_amount
        status
        damage_claim
        refund_due
        venue_amount
        created_at
      }
    }
    venueRentalStats(venue_id: $venue_id) {
      currency_symbol
      bookings
      open
      rent_total
      deposits_held
      earned
      paid_out
    }
  }
`);

/** The item came back, or part of the deposit is kept for damage. */
export const MarkRentalBookingDocument = gql(`
  mutation MobileMarkRentalBooking($id: ID!, $input: MarkRentalBookingInput!) {
    markRentalBooking(id: $id, input: $input) {
      id
      status
      damage_claim
      refund_due
      venue_amount
    }
  }
`);
